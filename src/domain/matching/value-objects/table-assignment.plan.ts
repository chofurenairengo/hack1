export type TableAssignmentPlan = Readonly<{
  tables: ReadonlyArray<
    Readonly<{
      id: string;
      seatCount: number;
      members: readonly string[];
    }>
  >;
  leftovers: readonly string[];
  score: number;
}>;
