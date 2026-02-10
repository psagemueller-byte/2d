/**
 * In-memory store for generation jobs.
 * Stores progress and results so the client can poll for status
 * even after the phone goes to sleep and wakes up.
 *
 * Note: On Vercel, each serverless function invocation may run on a different
 * instance. This works because we use a "poll triggers next step" pattern:
 * the store is populated within a single function invocation's lifetime.
 */

export interface GenerationViewResult {
  roomId: string;
  roomName: string;
  viewType: string;
  viewLabel: string;
  imageData: string;
}

export interface GenerationTask {
  roomId: string;
  roomName: string;
  roomDescription: string;
  roomType: string;
  style: string;
  viewType: string;
  viewLabel: string;
  taskType?: 'generate' | 'beautify';        // 'beautify' for 3D pipeline
  renderedImageData?: string;                  // base64 PNG from client 3D render
}

export interface GenerationJob {
  sessionId: string;
  status: 'pending' | 'analyzing' | 'generating' | 'completed' | 'failed';
  analysis: string;
  imageData: string;
  tasks: GenerationTask[];
  currentTaskIndex: number;
  results: GenerationViewResult[];
  error?: string;
  isProcessing: boolean;
  createdAt: number;
}

const jobs = new Map<string, GenerationJob>();

// Auto-cleanup jobs older than 30 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Check every 5 min
const MAX_AGE = 30 * 60 * 1000; // 30 min

function cleanup() {
  const now = Date.now();
  for (const [key, job] of jobs.entries()) {
    if (now - job.createdAt > MAX_AGE) {
      jobs.delete(key);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL);

export function createJob(
  sessionId: string,
  imageData: string,
  tasks: GenerationTask[]
): GenerationJob {
  const job: GenerationJob = {
    sessionId,
    status: 'pending',
    analysis: '',
    imageData,
    tasks,
    currentTaskIndex: 0,
    results: [],
    isProcessing: false,
    createdAt: Date.now(),
  };
  jobs.set(sessionId, job);
  return job;
}

export function getJob(sessionId: string): GenerationJob | undefined {
  return jobs.get(sessionId);
}

export function updateJob(sessionId: string, updates: Partial<GenerationJob>): void {
  const job = jobs.get(sessionId);
  if (job) {
    Object.assign(job, updates);
  }
}

export function addResult(sessionId: string, result: GenerationViewResult): void {
  const job = jobs.get(sessionId);
  if (job) {
    job.results.push(result);
    job.currentTaskIndex = job.results.length;
  }
}
