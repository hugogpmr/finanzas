import { getDashboardData } from "@/features/dashboard/queries";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardView data={data} />;
}
