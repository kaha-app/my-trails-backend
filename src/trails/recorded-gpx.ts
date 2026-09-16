/** Generate a portable route from persisted recordings, keeping session boundaries. */
export function recordedGpx(name: string, sessions: { trackPoints: { latitude: unknown; longitude: unknown; elevation?: unknown; timestamp: Date }[] }[]): string {
  const escape = (value: unknown) => String(value).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
  const segments = sessions.filter((s) => s.trackPoints.length).map((s) => `<trkseg>${s.trackPoints.map((p) => `<trkpt lat="${escape(p.latitude)}" lon="${escape(p.longitude)}">${p.elevation == null ? '' : `<ele>${escape(p.elevation)}</ele>`}<time>${p.timestamp.toISOString()}</time></trkpt>`).join('')}</trkseg>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="MyTrails" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escape(name)}</name>${segments}</trk></gpx>`;
}
