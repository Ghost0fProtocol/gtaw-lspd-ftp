export type NotebookItem = {
  id: string;
  label: string;
  completed: boolean;
};


export type NotebookSection = {
  section: string;
  items: NotebookItem[];
};


export type Trainee = {
  id: string;
  name: string;
  reference: string;
  status: string;
  progress: number;
  reports: number;
  lastActivity: string;
  ftm: string;
  notebook: NotebookSection[];
};