import { resolveAttachmentFileType, formatFileSize } from '../src/core/storage/attachmentHelper';
import { ChatService } from '../src/core/services/chatService';
import { apiClient } from '../src/core/api/apiClient';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Chat Attachments & File Types Resolution', () => {
  it('identifies PDF files correctly by extension and MIME', () => {
    expect(resolveAttachmentFileType('application/pdf', 'contract.pdf')).toBe('pdf');
    expect(resolveAttachmentFileType(null, 'REPORT.PDF')).toBe('pdf');
    expect(resolveAttachmentFileType('application/pdf', null)).toBe('pdf');
  });

  it('identifies Word documents correctly by extension and MIME', () => {
    expect(resolveAttachmentFileType('application/msword', 'doc.doc')).toBe('word');
    expect(
      resolveAttachmentFileType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'spec.docx'
      )
    ).toBe('word');
    expect(resolveAttachmentFileType(null, 'OFFER_LETTER.DOCX')).toBe('word');
  });

  it('identifies Excel spreadsheets and CSV files correctly', () => {
    expect(resolveAttachmentFileType('application/vnd.ms-excel', 'data.xls')).toBe('excel');
    expect(resolveAttachmentFileType(null, 'payroll.xlsx')).toBe('excel');
    expect(resolveAttachmentFileType('text/csv', 'attendance.csv')).toBe('excel');
  });

  it('identifies PowerPoint presentation files correctly', () => {
    expect(resolveAttachmentFileType('application/vnd.ms-powerpoint', 'deck.ppt')).toBe('ppt');
    expect(resolveAttachmentFileType(null, 'ALL_HANDS.PPTX')).toBe('ppt');
  });

  it('identifies plain text and markdown files correctly', () => {
    expect(resolveAttachmentFileType('text/plain', 'notes.txt')).toBe('txt');
    expect(resolveAttachmentFileType(null, 'README.MD')).toBe('txt');
  });

  it('identifies archives (ZIP, RAR, 7Z, TAR)', () => {
    expect(resolveAttachmentFileType('application/zip', 'archive.zip')).toBe('archive');
    expect(resolveAttachmentFileType(null, 'backup.rar')).toBe('archive');
    expect(resolveAttachmentFileType(null, 'dist.tar.gz')).toBe('archive');
  });

  it('identifies audio and video media files', () => {
    expect(resolveAttachmentFileType('audio/mpeg', 'voicenote.mp3')).toBe('audio');
    expect(resolveAttachmentFileType(null, 'CALL_RECORDING.M4A')).toBe('audio');
    expect(resolveAttachmentFileType('video/mp4', 'meeting.mp4')).toBe('video');
    expect(resolveAttachmentFileType(null, 'clip.mov')).toBe('video');
  });

  it('identifies image files correctly', () => {
    expect(resolveAttachmentFileType('image/png', 'photo.png')).toBe('image');
    expect(resolveAttachmentFileType(null, 'AVATAR.JPEG')).toBe('image');
    expect(resolveAttachmentFileType('image/webp', 'screen.webp')).toBe('image');
  });

  it('falls back to other for unknown types', () => {
    expect(resolveAttachmentFileType('application/octet-stream', 'custom.xyz')).toBe('other');
  });

  it('formats file sizes accurately', () => {
    expect(formatFileSize(0)).toBe('');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('ChatService - Message Actions & Interactions API Contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getPinnedMessages calls GET /api/chat/messages/:threadId/pinned', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 'msg_1',
          threadId: 'thread_10',
          content: 'Important pinned update',
          isPinned: true,
          createdAt: '2026-11-18T10:00:00.000Z',
        },
      ],
    });

    const pinned = await ChatService.getPinnedMessages('thread_10');
    expect(apiClient.get).toHaveBeenCalledWith('/api/chat/messages/thread_10/pinned');
    expect(pinned.length).toBe(1);
    expect(pinned[0].isPinned).toBe(true);
    expect(pinned[0].content).toBe('Important pinned update');
  });

  it('reactToMessage and toggleReaction call POST /api/chat/messages/:id/react', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 'msg_1',
        reactions: [{ emoji: '👍', count: 1, users: ['user_me'] }],
      },
    });

    const res = await ChatService.reactToMessage('msg_1', '👍');
    expect(apiClient.post).toHaveBeenCalledWith('/api/chat/messages/msg_1/react', { emoji: '👍' });
    expect(res.reactions?.length).toBe(1);
    expect(res.reactions?.[0].emoji).toBe('👍');
  });

  it('pinMessage calls POST /api/chat/messages/:id/pin', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 'msg_1',
        isPinned: true,
      },
    });

    const res = await ChatService.pinMessage('msg_1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/chat/messages/msg_1/pin', {});
    expect(res.isPinned).toBe(true);
  });

  it('forwardMessageBatch dispatches payload to POST /api/chat/messages/forward-batch', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        forwardedCount: 3,
      },
    });

    const res = await ChatService.forwardMessageBatch('msg_1', ['t1', 't2', 't3']);
    expect(apiClient.post).toHaveBeenCalledWith('/api/chat/messages/forward-batch', {
      messageId: 'msg_1',
      targetThreadIds: ['t1', 't2', 't3'],
    });
    expect(res.forwardedCount).toBe(3);
  });

  it('deleteMessage dispatches correct query params for me vs everyone', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { mode: 'me' },
    });

    await ChatService.deleteMessage('msg_1', 'me');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/chat/messages/msg_1', {
      params: { mode: 'me', forEveryone: undefined },
    });

    (apiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { mode: 'everyone' },
    });

    await ChatService.deleteMessage('msg_2', 'everyone');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/chat/messages/msg_2', {
      params: { mode: 'everyone', forEveryone: 'true' },
    });
  });
});
