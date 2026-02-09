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
  | 'generating'
  | 'completed'
  | 'failed';
