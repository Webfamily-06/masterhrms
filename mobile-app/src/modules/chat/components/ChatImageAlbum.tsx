import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ChatAttachment } from '../../../core/services/chatService';

export interface ChatImageAlbumProps {
  images: ChatAttachment[];
  onPressImage: (index: number) => void;
  isMe?: boolean;
  maxWidth?: number;
  style?: ViewStyle;
}

export const ChatImageAlbum: React.FC<ChatImageAlbumProps> = ({
  images,
  onPressImage,
  isMe: _isMe = false,
  maxWidth,
  style,
}) => {
  if (!images || images.length === 0) {
    return null;
  }

  const getImageUri = (att: ChatAttachment) => {
    return att.url || att.signedPreviewUrl || att.signedDownloadUrl || '';
  };

  const total = images.length;

  // 1 Image: Large display
  if (total === 1) {
    const item = images[0];
    return (
      <View style={[styles.container, maxWidth ? { maxWidth } : null, style]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressImage(0)}
          accessibilityRole="button"
          accessibilityLabel="Photo 1 of 1"
          testID="chat-image-album-0"
          style={styles.singleImageTouch}
        >
          <Image
            source={{ uri: getImageUri(item) }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // 2 Images: 2 columns side by side
  if (total === 2) {
    return (
      <View style={[styles.container, maxWidth ? { maxWidth } : null, style]}>
        <View style={styles.row}>
          {images.map((item, idx) => (
            <TouchableOpacity
              key={item.id || `img-${idx}`}
              activeOpacity={0.9}
              onPress={() => onPressImage(idx)}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${idx + 1} of 2`}
              testID={`chat-image-album-${idx}`}
              style={styles.twoColItem}
            >
              <Image
                source={{ uri: getImageUri(item) }}
                style={styles.twoColImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 3 Images: 2 columns in top row, 1 full-width in bottom row
  if (total === 3) {
    return (
      <View style={[styles.container, maxWidth ? { maxWidth } : null, style]}>
        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressImage(0)}
            accessibilityRole="button"
            accessibilityLabel="Photo 1 of 3"
            testID="chat-image-album-0"
            style={styles.threeColTopItem}
          >
            <Image
              source={{ uri: getImageUri(images[0]) }}
              style={styles.threeTopImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressImage(1)}
            accessibilityRole="button"
            accessibilityLabel="Photo 2 of 3"
            testID="chat-image-album-1"
            style={styles.threeColTopItem}
          >
            <Image
              source={{ uri: getImageUri(images[1]) }}
              style={styles.threeTopImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressImage(2)}
          accessibilityRole="button"
          accessibilityLabel="Photo 3 of 3"
          testID="chat-image-album-2"
          style={styles.threeBottomTouch}
        >
          <Image
            source={{ uri: getImageUri(images[2]) }}
            style={styles.threeBottomImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // 4 Images: 2x2 grid
  if (total === 4) {
    return (
      <View style={[styles.container, maxWidth ? { maxWidth } : null, style]}>
        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressImage(0)}
            accessibilityRole="button"
            accessibilityLabel="Photo 1 of 4"
            testID="chat-image-album-0"
            style={styles.fourColItem}
          >
            <Image
              source={{ uri: getImageUri(images[0]) }}
              style={styles.fourImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressImage(1)}
            accessibilityRole="button"
            accessibilityLabel="Photo 2 of 4"
            testID="chat-image-album-1"
            style={styles.fourColItem}
          >
            <Image
              source={{ uri: getImageUri(images[1]) }}
              style={styles.fourImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
        <View style={[styles.row, styles.marginTopRow]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressImage(2)}
            accessibilityRole="button"
            accessibilityLabel="Photo 3 of 4"
            testID="chat-image-album-2"
            style={styles.fourColItem}
          >
            <Image
              source={{ uri: getImageUri(images[2]) }}
              style={styles.fourImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressImage(3)}
            accessibilityRole="button"
            accessibilityLabel="Photo 4 of 4"
            testID="chat-image-album-3"
            style={styles.fourColItem}
          >
            <Image
              source={{ uri: getImageUri(images[3]) }}
              style={styles.fourImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 5 to 10+ Images: 2x2 grid with +N remaining count overlay on 4th image
  const visible = images.slice(0, 4);
  const remainingCount = total - 4;

  return (
    <View style={[styles.container, maxWidth ? { maxWidth } : null, style]}>
      {/* Row 1: Photos 0 & 1 */}
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressImage(0)}
          accessibilityRole="button"
          accessibilityLabel={`Photo 1 of ${total}`}
          testID="chat-image-album-0"
          style={styles.fourColItem}
        >
          <Image
            source={{ uri: getImageUri(visible[0]) }}
            style={styles.fourImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressImage(1)}
          accessibilityRole="button"
          accessibilityLabel={`Photo 2 of ${total}`}
          testID="chat-image-album-1"
          style={styles.fourColItem}
        >
          <Image
            source={{ uri: getImageUri(visible[1]) }}
            style={styles.fourImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      {/* Row 2: Photo 2 & Photo 3 (with +N overlay) */}
      <View style={[styles.row, styles.marginTopRow]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressImage(2)}
          accessibilityRole="button"
          accessibilityLabel={`Photo 3 of ${total}`}
          testID="chat-image-album-2"
          style={styles.fourColItem}
        >
          <Image
            source={{ uri: getImageUri(visible[2]) }}
            style={styles.fourImage}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressImage(3)}
          accessibilityRole="button"
          accessibilityLabel={`Photo 4 of ${total}, +${remainingCount} more`}
          testID="chat-image-album-3"
          style={styles.fourColItem}
        >
          <Image
            source={{ uri: getImageUri(visible[3]) }}
            style={styles.fourImage}
            resizeMode="cover"
          />
          {remainingCount > 0 && (
            <View
              style={styles.overlayContainer}
              pointerEvents="none"
              testID="chat-image-album-overlay-wrap"
            >
              <Text testID="chat-image-album-overlay" style={styles.overlayText}>
                {`+${remainingCount}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  marginTopRow: {
    marginTop: 4,
  },
  singleImageTouch: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#182229',
  },
  singleImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#182229',
  },
  twoColItem: {
    flex: 1,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#182229',
  },
  twoColImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#182229',
  },
  threeColTopItem: {
    flex: 1,
    height: 115,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#182229',
  },
  threeTopImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#182229',
  },
  threeBottomTouch: {
    width: '100%',
    height: 115,
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#182229',
  },
  threeBottomImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#182229',
  },
  fourColItem: {
    flex: 1,
    height: 105,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#182229',
  },
  fourImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#182229',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 20, 26, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
