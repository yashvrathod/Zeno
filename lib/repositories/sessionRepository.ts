import prisma from '@/lib/prisma';

export async function findSessionWithMessages(userId: string, problemId: string) {
  return prisma.mentorSession.findUnique({
    where: { userId_problemId: { userId, problemId } },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function saveMessageToSession(
  sessionId: string,
  role: string,
  content: string,
  stage: string,
) {
  return prisma.mentorMessage.create({
    data: { sessionId, role, content, stage },
  });
}

export async function getSessionMessageCount(sessionId: string) {
  return prisma.mentorMessage.count({ where: { sessionId } });
}
