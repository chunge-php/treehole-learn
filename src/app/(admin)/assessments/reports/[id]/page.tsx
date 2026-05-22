import { notFound } from "next/navigation";
import { getReportSessionDetail } from "../actions";
import { AnswerRunner } from "./_components/AnswerRunner";
import { requireAdmin } from "@/lib/auth";

export default async function ReportRunnerPage({ params }: { params: { id: string } }) {
  requireAdmin();
  const detail = await getReportSessionDetail(params.id);
  if (!detail) notFound();
  const { session, questions, answers } = detail;

  return (
    <AnswerRunner
      sessionId={session.id}
      sessionName={session.name}
      total={session.total_questions}
      questions={questions as any[]}
      initialAnswers={answers}
    />
  );
}
