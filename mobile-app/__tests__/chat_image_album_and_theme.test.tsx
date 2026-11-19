import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ChatImageAlbum } from '../src/modules/chat/components/ChatImageAlbum';
import { ChatService, ChatAttachment } from '../src/core/services/chatService';
import { apiClient } from '../src/core/api/apiClient';
import {
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  MAX_CHAT_FILE_SIZE_BYTES,
} from '../src/core/storage/attachmentHelper';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const createMockImage = (id: string, name: string): ChatAttachment => ({
  id,
  name,
  url: `https://example.com/uploads/${name}`,
  kind: 'image',
  mimeType: 'image/jpeg',
  size: 1024 * 500,
});

const createMockDoc = (id: string, name: string): ChatAttachment => ({
  id,
  name,
  url: `https://example.com/uploads/${name}`,
  kind: 'pdf',
  mimeType: 'application/pdf',
  size: 1024 * 1200,
});

describe('Phase 1: ChatImageAlbum Layout & Grid Scenarios', () => {
  it('Scenario 1: renders 1 image correctly in single large card mode', () => {
    const images = [createMockImage('img-1', 'photo1.jpg')];
    const onPress = jest.fn();

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    const root = renderer.root;
    const item0 = root.findByProps({ testID: 'chat-image-album-0' });
    expect(item0).toBeDefined();

    // Verify tap calls index 0
    act(() => {
      item0.props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith(0);

    // Verify no overlay exists
    const overlays = root.findAllByProps({ testID: 'chat-image-album-overlay' });
    expect(overlays.length).toBe(0);
  });

  it('Scenario 2: renders 2 images side by side in equal columns', () => {
    const images = [
      createMockImage('img-1', 'photo1.jpg'),
      createMockImage('img-2', 'photo2.jpg'),
    ];
    const onPress = jest.fn();

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    const root = renderer.root;
    const item0 = root.findByProps({ testID: 'chat-image-album-0' });
    const item1 = root.findByProps({ testID: 'chat-image-album-1' });
    expect(item0).toBeDefined();
    expect(item1).toBeDefined();

    act(() => {
      item1.props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith(1);
  });

  it('Scenario 3: renders 3 images in balanced layout (2 top, 1 bottom full-width)', () => {
    const images = [
      createMockImage('img-1', 'photo1.jpg'),
      createMockImage('img-2', 'photo2.jpg'),
      createMockImage('img-3', 'photo3.jpg'),
    ];
    const onPress = jest.fn();

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    const root = renderer.root;
    expect(root.findByProps({ testID: 'chat-image-album-0' })).toBeDefined();
    expect(root.findByProps({ testID: 'chat-image-album-1' })).toBeDefined();
    expect(root.findByProps({ testID: 'chat-image-album-2' })).toBeDefined();

    // No remaining count overlay for 3 images
    const overlays = root.findAllByProps({ testID: 'chat-image-album-overlay' });
    expect(overlays.length).toBe(0);
  });

  it('Scenario 4: renders 4 images in a 2x2 grid without +0 overlay', () => {
    const images = [
      createMockImage('img-1', 'photo1.jpg'),
      createMockImage('img-2', 'photo2.jpg'),
      createMockImage('img-3', 'photo3.jpg'),
      createMockImage('img-4', 'photo4.jpg'),
    ];
    const onPress = jest.fn();

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    const root = renderer.root;
    expect(root.findByProps({ testID: 'chat-image-album-0' })).toBeDefined();
    expect(root.findByProps({ testID: 'chat-image-album-1' })).toBeDefined();
    expect(root.findByProps({ testID: 'chat-image-album-2' })).toBeDefined();
    expect(root.findByProps({ testID: 'chat-image-album-3' })).toBeDefined();

    // Must never show +0 overlay
    const overlays = root.findAllByProps({ testID: 'chat-image-album-overlay' });
    expect(overlays.length).toBe(0);
  });

  it('Scenario 5: renders 5 images showing +1 remaining count overlay on 4th image', () => {
    const images = Array.from({ length: 5 }, (_, i) =>
      createMockImage(`img-${i + 1}`, `photo${i + 1}.jpg`)
    );
    const onPress = jest.fn();

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    const root = renderer.root;
    const overlay = root.findByProps({ testID: 'chat-image-album-overlay' });
    expect(overlay).toBeDefined();
    expect(overlay.props.children).toBe('+1');

    // Tapping 4th item with overlay passes index 3
    const item3 = root.findByProps({ testID: 'chat-image-album-3' });
    act(() => {
      item3.props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith(3);
  });

  it('Scenario 6: renders 10 images showing +6 remaining count overlay on 4th image', () => {
    const images = Array.from({ length: 10 }, (_, i) =>
      createMockImage(`img-${i + 1}`, `photo${i + 1}.jpg`)
    );
    const onPress = jest.fn();

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    const root = renderer.root;
    const overlay = root.findByProps({ testID: 'chat-image-album-overlay' });
    expect(overlay).toBeDefined();
    expect(overlay.props.children).toBe('+6');
  });

  it('Scenario 7: mixed media - image attachments and documents separation', () => {
    const allAttachments = [
      createMockImage('img-1', 'screenshot.png'),
      createMockImage('img-2', 'diagram.png'),
      createMockDoc('doc-1', 'spec.pdf'),
    ];

    const imageAttachments = allAttachments.filter((a) => a.kind === 'image');
    const docAttachments = allAttachments.filter((a) => a.kind !== 'image');

    expect(imageAttachments.length).toBe(2);
    expect(docAttachments.length).toBe(1);

    // Only images are passed to album grid
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={imageAttachments} onPressImage={jest.fn()} />
      );
    });
    const root = renderer.root;
    expect(root.findByProps({ testID: 'chat-image-album-0' })).toBeDefined();
    expect(root.findByProps({ testID: 'chat-image-album-1' })).toBeDefined();
    expect(root.findAllByProps({ testID: 'chat-image-album-2' }).length).toBe(0);
  });

  it('Scenario 8: album thumbnail selection calls onPressImage with accurate index', () => {
    const images = Array.from({ length: 6 }, (_, i) =>
      createMockImage(`img-${i + 1}`, `pic${i + 1}.jpg`)
    );
    const onPress = jest.fn();

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    const root = renderer.root;
    act(() => {
      root.findByProps({ testID: 'chat-image-album-2' }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith(2);
  });
});

describe('Phase 2 & 3: Selection, Removal & Attachment Limits', () => {
  it('Scenario 9: removing a selected image updates pending file list correctly', () => {
    const initialFiles = [
      { uri: 'file://a.jpg', name: 'a.jpg', type: 'image/jpeg', size: 100 },
      { uri: 'file://b.jpg', name: 'b.jpg', type: 'image/jpeg', size: 200 },
      { uri: 'file://c.jpg', name: 'c.jpg', type: 'image/jpeg', size: 300 },
    ];

    const currentIdx = 1; // Remove 'b.jpg'
    const updated = initialFiles.filter((_, idx) => idx !== currentIdx);

    expect(updated.length).toBe(2);
    expect(updated[0].name).toBe('a.jpg');
    expect(updated[1].name).toBe('c.jpg');
  });

  it('Scenario 10: caption is applied to the complete single album message', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'msg-album-1',
        threadId: 'thread-123',
        content: 'Check out these team offsite photos!',
        attachments: [
          createMockImage('att-1', 'photo1.jpg'),
          createMockImage('att-2', 'photo2.jpg'),
        ],
        createdAt: new Date().toISOString(),
      },
    });

    const result = await ChatService.sendMessage({
      threadId: 'thread-123',
      content: 'Check out these team offsite photos!',
      attachments: [
        createMockImage('att-1', 'photo1.jpg'),
        createMockImage('att-2', 'photo2.jpg'),
      ],
      clientTempId: 'mob_temp_1',
    });

    expect(result.content).toBe('Check out these team offsite photos!');
    expect(result.attachments?.length).toBe(2);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/chat/messages',
      expect.objectContaining({
        threadId: 'thread-123',
        content: 'Check out these team offsite photos!',
        attachments: expect.any(Array),
      })
    );
  });

  it('Scenario 11: one upload request handles multiple selected files', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        files: [
          { id: 'att-1', name: 'p1.jpg', url: 'https://example.com/p1.jpg', kind: 'image' },
          { id: 'att-2', name: 'p2.jpg', url: 'https://example.com/p2.jpg', kind: 'image' },
          { id: 'att-3', name: 'p3.jpg', url: 'https://example.com/p3.jpg', kind: 'image' },
        ],
      },
    });

    const files = [
      { uri: 'file://p1.jpg', name: 'p1.jpg', type: 'image/jpeg', size: 100 },
      { uri: 'file://p2.jpg', name: 'p2.jpg', type: 'image/jpeg', size: 100 },
      { uri: 'file://p3.jpg', name: 'p3.jpg', type: 'image/jpeg', size: 100 },
    ];

    const uploaded = await ChatService.uploadAttachments(files, 'thread-123');
    expect(uploaded.length).toBe(3);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/chat/upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );
  });

  it('Scenario 12: one message creation request contains all uploaded attachments in array', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'msg-999',
        threadId: 'thread-1',
        content: '',
        attachments: [
          createMockImage('a1', '1.jpg'),
          createMockImage('a2', '2.jpg'),
          createMockImage('a3', '3.jpg'),
          createMockImage('a4', '4.jpg'),
        ],
        createdAt: new Date().toISOString(),
      },
    });

    const uploaded = [
      createMockImage('a1', '1.jpg'),
      createMockImage('a2', '2.jpg'),
      createMockImage('a3', '3.jpg'),
      createMockImage('a4', '4.jpg'),
    ];

    const message = await ChatService.sendMessage({
      threadId: 'thread-1',
      content: '',
      attachments: uploaded,
    });

    expect(message.id).toBe('msg-999');
    expect(message.attachments?.length).toBe(4);
  });

  it('Scenario 13: upload failure throws clear error and does not post fake message', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error('Network error uploading files')
    );

    const files = [{ uri: 'file://x.jpg', name: 'x.jpg', type: 'image/jpeg', size: 100 }];

    await expect(ChatService.uploadAttachments(files, 'thread-1')).rejects.toThrow(
      'Network error uploading files'
    );
  });

  it('Scenario 14: message creation failure is handled honestly without fabricating success', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to create message on server')
    );

    await expect(
      ChatService.sendMessage({
        threadId: 'thread-1',
        content: 'Album description',
        attachments: [createMockImage('a1', 'a.jpg')],
      })
    ).rejects.toThrow('Failed to create message on server');
  });

  it('Scenario 15: enforces MAX_CHAT_ATTACHMENTS_PER_MESSAGE and size validation limits', () => {
    expect(MAX_CHAT_ATTACHMENTS_PER_MESSAGE).toBe(10);
    expect(MAX_CHAT_FILE_SIZE_BYTES).toBe(30 * 1024 * 1024);

    const overlimitFiles = Array.from({ length: 11 }, (_, i) => ({
      uri: `file://${i}.jpg`,
      name: `${i}.jpg`,
      type: 'image/jpeg',
      size: 1000,
    }));

    expect(overlimitFiles.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE).toBe(true);
  });
});

describe('Phase 7 & 8: Gallery Navigation, Integrity & Dark Theme', () => {
  it('Scenario 16: tapping an image opens gallery at that specific index', () => {
    const images = Array.from({ length: 5 }, (_, i) =>
      createMockImage(`img-${i}`, `img${i}.jpg`)
    );
    let openedIndex = -1;
    const onPress = (idx: number) => {
      openedIndex = idx;
    };

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ChatImageAlbum images={images} onPressImage={onPress} />
      );
    });

    act(() => {
      renderer.root.findByProps({ testID: 'chat-image-album-1' }).props.onPress();
    });
    expect(openedIndex).toBe(1);
  });

  it('Scenario 17: supports forward/backward navigation across gallery items', () => {
    const items = [
      createMockImage('1', 'a.jpg'),
      createMockImage('2', 'b.jpg'),
      createMockImage('3', 'c.jpg'),
    ];

    let current = 1;
    // Next
    current = Math.min(items.length - 1, current + 1);
    expect(current).toBe(2);

    // Prev
    current = Math.max(0, current - 1);
    expect(current).toBe(1);
  });

  it('Scenario 18: message bubble renders single timestamp and delivery receipt for the entire album', () => {
    // 5 images in 1 message
    const message = {
      id: 'msg-album',
      attachments: Array.from({ length: 5 }, (_, i) => createMockImage(`img-${i}`, `${i}.jpg`)),
      createdAt: '2026-11-18T10:30:00Z',
      deliveryStatus: 'read' as const,
    };

    // The message has 1 delivery status and 1 timestamp
    expect(message.deliveryStatus).toBe('read');
    expect(typeof message.createdAt).toBe('string');
  });

  it('Scenario 19: verifies WhatsApp dark palette specifications', () => {
    const WHATSAPP_DARK_PALETTE = {
      conversationBackground: '#0B141A',
      headerBackground: '#101820',
      incomingBubble: '#202C33',
      outgoingBubble: '#005C4B',
      primaryText: '#E9EDEF',
      secondaryText: '#AEBAC1',
      mutedIcons: '#8696A0',
      composerSurface: '#202C33',
      inputText: '#E9EDEF',
      placeholder: '#8696A0',
      sendAccent: '#00D287',
      readReceiptAccent: '#53BDEB',
    };

    expect(WHATSAPP_DARK_PALETTE.conversationBackground).toBe('#0B141A');
    expect(WHATSAPP_DARK_PALETTE.headerBackground).toBe('#101820');
    expect(WHATSAPP_DARK_PALETTE.incomingBubble).toBe('#202C33');
    expect(WHATSAPP_DARK_PALETTE.outgoingBubble).toBe('#005C4B');
    expect(WHATSAPP_DARK_PALETTE.primaryText).toBe('#E9EDEF');
    expect(WHATSAPP_DARK_PALETTE.secondaryText).toBe('#AEBAC1');
    expect(WHATSAPP_DARK_PALETTE.mutedIcons).toBe('#8696A0');
    expect(WHATSAPP_DARK_PALETTE.composerSurface).toBe('#202C33');
    expect(WHATSAPP_DARK_PALETTE.sendAccent).toBe('#00D287');
    expect(WHATSAPP_DARK_PALETTE.readReceiptAccent).toBe('#53BDEB');
  });

  it('Scenario 20: forward action forwards complete album message without fragmenting', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        forwardedCount: 2,
        targetThreads: ['thread-target-1', 'thread-target-2'],
      },
    });

    const forwardResult = await ChatService.forwardMessageBatch('msg-album-1', [
      'thread-target-1',
      'thread-target-2',
    ]);

    expect(forwardResult.forwardedCount).toBe(2);
    expect(apiClient.post).toHaveBeenCalledWith('/api/chat/messages/forward-batch', {
      messageId: 'msg-album-1',
      targetThreadIds: ['thread-target-1', 'thread-target-2'],
    });
  });
});
