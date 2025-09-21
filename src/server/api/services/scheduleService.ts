import { RecurrenceInterval } from '@prisma/client';
import { getDate, getMonth } from 'date-fns';
import { db } from '~/server/db';

export const createRecurringExpenseJob = async (
  expenseId: string,
  date: Date,
  repeatEvery: number,
  repeatInterval: RecurrenceInterval,
) => {
  // Implementation for creating a recurring expense job using pg_cron
  const cronExpression = getCronExpression(date, repeatEvery, repeatInterval);

  await db.$executeRaw`
SELECT cron.schedule(
  ${expenseId}, 
  ${cronExpression}, 
  $$ SELECT duplicate_expense_with_participants(${expenseId}::UUID); $$
);`;
};

const getCronExpression = (date: Date, repeatEvery: number, repeatInterval: RecurrenceInterval) => {
  switch (repeatInterval) {
    case RecurrenceInterval.DAILY:
    case RecurrenceInterval.WEEKLY: {
      const mult = repeatInterval === RecurrenceInterval.WEEKLY ? 7 : 1;
      return `0 0 ${getDate(date)}/${mult * repeatEvery} * *`;
    }
    case RecurrenceInterval.MONTHLY:
    case RecurrenceInterval.YEARLY: {
      const dayOfMonth = getDate(date);
      const mult = repeatInterval === RecurrenceInterval.YEARLY ? 12 : 1;
      return `0 0 ${dayOfMonth > 28 ? 'L' : dayOfMonth} ${getMonth(date) + 1}/${mult * repeatEvery} *`;
    }
    default:
      throw new Error('Invalid recurrence interval');
  }
};
