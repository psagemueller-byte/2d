export interface GalleryEntry {
  id: string;
  imageUrl: string;
  userName: string;
  roomStyle: string;
  roomType: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface GalleryManifest {
  entries: GalleryEntry[];
  updatedAt: string;
}
