const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type VideoResolution = "480p" | "720p" | "1080p" | "4k";
export type ImageResolution = "640px" | "1k" | "2k" | "4k";
export type JobStatus = "queued" | "processing" | "completed" | "failed";
export type ProjectKind = "video" | "image";
export type Workflow = "text-to-video" | "image-to-video" | "text-to-image";

export type Scene = {
  index: number;
  narration: string;
  visual_prompt: string;
  duration_seconds: number;
};

export type GenerationOptions = {
  aspect_ratio: AspectRatio;
  model: string;
  resolution: VideoResolution;
  audio: boolean;
};

export type SceneJob = {
  scene_index: number | null;
  job_id: string;
  kind: ProjectKind;
  workflow: Workflow;
  status: JobStatus;
  video_url: string | null;
  image_urls: string[];
  error: string | null;
};

export type ProviderModelOption = {
  id: string;
  label: string;
  resolutions: string[];
  durations: number[];
  supports_audio: boolean;
};

export type ProviderCapabilities = {
  provider: "magic-hour";
  video_models: ProviderModelOption[];
  image_models: ProviderModelOption[];
  image_style_tools: string[];
  aspect_ratios: AspectRatio[];
};

export type UploadedImage = {
  asset_id: string;
  filename: string;
  expires_at: string;
};

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((item: { msg?: string }) => item.msg || "Invalid request").join("; ");
    }
  } catch {
    // Keep the user-facing fallback when the response is not JSON.
  }
  return `${fallback} (${response.status})`;
}

export async function getCapabilities(): Promise<ProviderCapabilities> {
  const response = await fetch(`${API_BASE}/api/capabilities`);
  if (!response.ok) throw new Error(await errorMessage(response, "Provider options could not be loaded"));
  return response.json();
}

export async function createScript(params: {
  topic: string;
  language: "de" | "en";
  scene_count: number;
  tone: string;
}): Promise<{ scenes: Scene[] }> {
  const response = await fetch(`${API_BASE}/api/script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Storyboard could not be created"));
  return response.json();
}

export async function generateVideos(
  scenes: Scene[],
  options: GenerationOptions,
): Promise<{ jobs: SceneJob[] }> {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenes, options }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Video generation could not be started"));
  return response.json();
}

export async function generateImage(params: {
  prompt: string;
  name?: string;
  aspect_ratio: AspectRatio;
  model: string;
  resolution: ImageResolution;
  style_tool: string;
}): Promise<SceneJob> {
  const response = await fetch(`${API_BASE}/api/images/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Scene image could not be generated"));
  return response.json();
}

export async function uploadImage(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/assets/images`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Image could not be uploaded"));
  return response.json();
}

export async function generateVideoFromImage(params: {
  asset_id?: string;
  image_project_id?: string;
  prompt: string;
  name?: string;
  options: GenerationOptions;
  duration_seconds: number;
}): Promise<SceneJob> {
  const response = await fetch(`${API_BASE}/api/videos/from-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Image-to-video generation could not be started"));
  return response.json();
}

export async function checkStatus(jobId: string): Promise<SceneJob> {
  const response = await fetch(`${API_BASE}/api/status/${encodeURIComponent(jobId)}`);
  if (!response.ok) throw new Error(await errorMessage(response, "Project status could not be loaded"));
  return response.json();
}
