// src/components/style-guide/image.ts
const IMAGE_PATH = '/image';

interface ImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const Images: Record<string, ImageProps> = {
  logo: {src: `${IMAGE_PATH}/logo-prambon.png`, alt: 'SMP Negeri 1 Prambon', width: 120, height: 120},
};
