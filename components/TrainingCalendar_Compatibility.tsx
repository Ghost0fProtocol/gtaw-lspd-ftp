"use client";

import BatchManagement from "./BatchManagement";

type Props = {
  user: any;
};

export default function TrainingCalendar({
  user,
}: Props) {
  return (
    <BatchManagement
      user={user}
    />
  );
}