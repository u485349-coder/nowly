import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SaveFormat, manipulateAsync } from "expo-image-manipulator";

const TARGET_AVATAR_DATA_URL_LENGTH = 900_000;
const HARD_AVATAR_DATA_URL_LENGTH = 4_900_000;
const AVATAR_SIZES = [768, 640, 512, 384, 320, 256];
const AVATAR_COMPRESSIONS = [0.82, 0.7, 0.58, 0.46, 0.34, 0.24];

export type AvatarSelection = {
  dataUrl: string;
  fileName: string;
};

const buildSquareCrop = (width?: number | null, height?: number | null) => {
  if (!width || !height || width === height) {
    return [];
  }

  const side = Math.min(width, height);
  const originX = Math.max(0, Math.floor((width - side) / 2));
  const originY = Math.max(0, Math.floor((height - side) / 2));

  return [
    {
      crop: {
        originX,
        originY,
        width: side,
        height: side,
      },
    } as const,
  ];
};

const createAvatarDataUrl = async (asset: ImagePicker.ImagePickerAsset) => {
  const cropActions = buildSquareCrop(asset.width, asset.height);
  let fallbackDataUrl: string | null = null;

  for (const size of AVATAR_SIZES) {
    for (const compress of AVATAR_COMPRESSIONS) {
      const result = await manipulateAsync(
        asset.uri,
        [
          ...cropActions,
          {
            resize: {
              width: size,
              height: size,
            },
          },
        ],
        {
          base64: true,
          compress,
          format: SaveFormat.JPEG,
        },
      );

      if (!result.base64) {
        continue;
      }

      const dataUrl = `data:image/jpeg;base64,${result.base64}`;
      fallbackDataUrl = dataUrl;

      if (dataUrl.length <= TARGET_AVATAR_DATA_URL_LENGTH) {
        return dataUrl;
      }
    }
  }

  if (fallbackDataUrl && fallbackDataUrl.length <= HARD_AVATAR_DATA_URL_LENGTH) {
    return fallbackDataUrl;
  }

  throw new Error("That photo is still too large after resizing. Try a tighter crop or a different image.");
};

export const pickAvatarImage = async (): Promise<AvatarSelection | null> => {
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new Error("Allow photo access so you can add a profile picture.");
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    base64: false,
    selectionLimit: 1,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset?.uri) {
    throw new Error("Photo couldn't be added. Try another image and we'll pull it in.");
  }

  const dataUrl = await createAvatarDataUrl(asset);

  return {
    dataUrl,
    fileName: asset.fileName ?? "Profile photo",
  };
};
