import { supabase } from "./supabase";

export type LearningGoalTemplateRow = {
  id: string;
  template_key: string;
  section: string;
  goal_key: string;
  label: string;
  section_order: number;
  goal_order: number;
  is_mandatory: boolean;
  is_course: boolean;
  is_active: boolean;
};

export type NotebookTemplateItem = {
  id: string;
  label: string;
  completed: false;
};

export type NotebookTemplateSection = {
  section: string;
  items: NotebookTemplateItem[];
};

export async function getActiveLearningGoals(
  templateKey =
    "probationary_officer_2026"
) {
  const {
    data,
    error,
  } = await supabase
    .from("learning_goals")
    .select(`
      id,
      template_key,
      section,
      goal_key,
      label,
      section_order,
      goal_order,
      is_mandatory,
      is_course,
      is_active
    `)
    .eq(
      "template_key",
      templateKey
    )
    .eq(
      "is_active",
      true
    )
    .order(
      "section_order",
      {
        ascending: true,
      }
    )
    .order(
      "goal_order",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "GET ACTIVE LEARNING GOALS ERROR",
      error
    );

    throw error;
  }

  return (
    data ??
    []
  ) as LearningGoalTemplateRow[];
}

export async function getNotebookTemplate(
  templateKey =
    "probationary_officer_2026"
): Promise<
  NotebookTemplateSection[]
> {
  const goals =
    await getActiveLearningGoals(
      templateKey
    );

  return goals.reduce(
    (
      sections,
      goal
    ) => {
      let section =
        sections.find(
          (item) =>
            item.section ===
            goal.section
        );

      if (!section) {
        section = {
          section:
            goal.section,
          items: [],
        };

        sections.push(
          section
        );
      }

      section.items.push({
        id:
          goal.goal_key,
        label:
          goal.label,
        completed:
          false,
      });

      return sections;
    },
    [] as NotebookTemplateSection[]
  );
}

export async function createNotebookItemsFromTemplate({
  traineeId,
  templateKey =
    "probationary_officer_2026",
}: {
  traineeId: string;
  templateKey?: string;
}) {
  const goals =
    await getActiveLearningGoals(
      templateKey
    );

  if (
    goals.length === 0
  ) {
    throw new Error(
      "No active learning goals were found for the selected notebook template."
    );
  }

  const rows =
    goals.map(
      (goal) => ({
        trainee_id:
          traineeId,
        section:
          goal.section,
        item_label:
          goal.label,
        completed:
          false,
      })
    );

  const {
    data,
    error,
  } = await supabase
    .from("notebook_items")
    .insert(rows)
    .select("*");

  if (error) {
    console.error(
      "CREATE NOTEBOOK ITEMS FROM TEMPLATE ERROR",
      error
    );

    throw error;
  }

  const {
    error:
      traineeUpdateError,
  } = await supabase
    .from("trainees")
    .update({
      notebook_template_key:
        templateKey,
    })
    .eq(
      "id",
      traineeId
    );

  if (
    traineeUpdateError
  ) {
    console.error(
      "UPDATE TRAINEE TEMPLATE KEY ERROR",
      traineeUpdateError
    );

    throw traineeUpdateError;
  }

  return data ?? [];
}