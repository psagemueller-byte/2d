export type RoomStyleId =
  | 'modern'
  | 'scandinavian'
  | 'industrial'
  | 'minimalist'
  | 'bohemian'
  | 'classic'
  | 'japanese'
  | 'mediterranean';

export type RoomTypeId =
  | 'living-room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'office';

export interface RoomStyle {
  id: RoomStyleId;
  name: string;
  description: string;
  promptModifier: string;
}

export interface RoomType {
  id: RoomTypeId;
  name: string;
  icon: string;
}

export type GenerationStep =
  | 'idle'
  | 'analyzing'
  | 'generating_view1'
  | 'generating_view2'
  | 'generating_view3'
  | 'completed'
  | 'failed';

export type ViewType = 'perspective' | 'side' | 'topdown';

export interface GeneratedView {
  type: ViewType;
  label: string;
  imageUrl: string;
  roomId?: string;
}

export interface DetectedRoom {
  id: string;
  name: string;
  type: RoomTypeId;
  description: string;
  selected: boolean;
  selectedStyle?: RoomStyleId;
}

export interface RoomResult {
  roomId: string;
  roomName: string;
  views: GeneratedView[];
}
