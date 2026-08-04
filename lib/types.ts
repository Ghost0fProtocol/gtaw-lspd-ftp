export type NotebookItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type NotebookSection = {
  section: string;
  items: NotebookItem[];
};

export type TrainingStage =
  | "Week 1"
  | "Week 2"
  | "FPP"
  | "Final Evaluation"
  | "Completed"
  | "P2";

export type PPOWEROutcome =
  | "Satisfactory"
  | "Unsatisfactory"
  | null;

export type Trainee = {
  id: string;
  profileId?: string;

  name: string;
  reference: string;
  status: string;

  progress: number;
  reports: number;
  lastActivity: string;

  ftm: string;
  assignedFtmId?: string | null;

  notebook: NotebookSection[];

  trainingStage: TrainingStage;

  week1PPOWEROutcome: PPOWEROutcome;
  week2PPOWEROutcome: PPOWEROutcome;

  week1PPOWERCompletedAt?: string | null;
  week2PPOWERCompletedAt?: string | null;

  fppStartedAt?: string | null;

  finalEvaluationUnlockedAt?: string | null;
  finalEvaluationCompletedAt?: string | null;
  finalEvaluationDORId?: string | null;

  progressionUpdatedAt?: string | null;
  progressionUpdatedBy?: string | null;

  promotedToP2At?: string | null;
  promotedToP2By?: string | null;
};