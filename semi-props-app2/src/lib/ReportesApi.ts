// src/lib/ReportesApi.ts

export async function fetchVehiclesEnteredByMonth(apiUrl: string, token?: string) {
  const res = await fetch(`${apiUrl}/report_vehicles_entered_by_month`, {
    headers: token
      ? { 'Authorization': `Bearer ${token}` }
      : undefined,
  });
  if (!res.ok) throw new Error('Failed to fetch vehicles entered by month');
  return res.json();
}
