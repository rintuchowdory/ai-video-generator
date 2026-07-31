const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export type Scene = {
  index: number;
  narration: string;
  visual_prompt: string;
  duration_seconds: number;
};

export type SceneJob = {
  scene_index: number;
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  video_url: string | null;
  error: string | null;
};

export async function createScript(params: {
  topic: string;
  language: "de" | "en";
  scene_count: number;
  tone: string;
}): Promise<{ scenes: Scene[] }> {
  const res = await fetch(`${API_BASE}/api/script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Storyboard konnte nicht erstellt werden (${res.status})`);
  return res.json();
}

export async function generateVideos(scenes: Scene[], aspect_ratio: string): Promise<{ jobs: SceneJob[] }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenes, aspect_ratio }),
  });
  if (!res.ok) throw new Error(`Videogenerierung konnte nicht gestartet werden (${res.status})`);
  return res.json();
}

export async function checkStatus(jobId: string): Promise<SceneJob> {
  const res = await fetch(`${API_BASE}/api/status/${jobId}`);
  if (!res.ok) throw new Error(`Status konnte nicht abgerufen werden (${res.status})`);
  const data = await res.json();
  return { scene_index: -1, job_id: data.job_id, status: data.status, video_url: data.video_url, error: data.error };
}
