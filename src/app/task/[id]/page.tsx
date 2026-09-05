import { TaskDetailPage } from "@/components/task/task-detail-page-v2";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TaskPage({ params }: Props) {
  const { id } = await params;
  return <TaskDetailPage taskId={id} />;
}
