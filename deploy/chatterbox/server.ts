import { join } from "@std/path";
import { ensureDir } from "@std/fs";

interface VoiceRequest {
  text: string;
  voice: string;
  exageration?: number;
  cfg_weight?: number;
  output_filename?: string;
  split?: boolean;
  split_chars?: number;
}

async function getAvailableVoices(): Promise<string[]> {
  try {
    const voices: string[] = [];
    for await (const dirEntry of Deno.readDir("./references")) {
      if (dirEntry.isFile && dirEntry.name.endsWith(".wav")) {
        voices.push(dirEntry.name.slice(0, -4));
      }
    }
    return voices.sort();
  } catch (error) {
    console.error("Error reading references directory:", error);
    return [];
  }
}

async function synthesizeVoice(
  text: string,
  voice: string,
  exageration: number = 0.5,
  cfg_weight: number = 0.5,
  output_filename?: string,
  split: boolean = false,
  split_chars: number = 400,
): Promise<string> {
  const outputDir = "./output";
  await ensureDir(outputDir);

  let filename = output_filename ||
    `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`;

  if (filename && !filename.toLowerCase().endsWith(".wav")) {
    filename = filename + ".wav";
  }

  const outputPath = join(outputDir, filename);
  const referencePath = join("./references", `${voice}.wav`);

  // PYTHON_EXEC can override the interpreter, e.g. for local uv dev:
  //   PYTHON_EXEC="uv run python" deno run -A server.ts
  // In Docker (pip-installed deps) this defaults to "python3".
  const pythonExecEnv = Deno.env.get("PYTHON_EXEC") || "python3";
  const pythonParts = pythonExecEnv.trim().split(/\s+/);
  const pythonBin = pythonParts[0];

  const args = [
    ...pythonParts.slice(1),
    "voice_synthesizer.py",
    "--text",
    text,
    "--exageration",
    exageration.toString(),
    "--cfg_weight",
    cfg_weight.toString(),
    "--output",
    outputPath,
    "--reference",
    referencePath,
  ];

  if (split) {
    args.push("--split");
    args.push("--split_chars", split_chars.toString());
  }

  const command = new Deno.Command(pythonBin, {
    args,
    stdout: "piped",
    stderr: "piped",
    env: { ...Deno.env.toObject() },
  });

  const { code, stderr, stdout } = await command.output();

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    const outputText = new TextDecoder().decode(stdout);
    console.error("Python script failed:");
    console.error("STDERR:", errorText);
    console.error("STDOUT:", outputText);
    console.error("Exit code:", code);
    throw new Error(
      `voice_synthesizer.py failed (exit code ${code}): ${
        errorText || outputText
      }`,
    );
  }

  return outputPath;
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "POST" && url.pathname === "/synthesize") {
    try {
      const body: VoiceRequest = await req.json();

      if (!body.text || !body.voice) {
        return new Response(
          JSON.stringify({ error: "text and voice parameters are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const availableVoices = await getAvailableVoices();
      if (!availableVoices.includes(body.voice)) {
        return new Response(
          JSON.stringify({
            error: "Invalid voice. Available voices: " +
              availableVoices.join(", "),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const audioPath = await synthesizeVoice(
        body.text,
        body.voice,
        body.exageration,
        body.cfg_weight,
        body.output_filename,
        body.split ?? false,
        body.split_chars ?? 400,
      );
      const audioFile = await Deno.readFile(audioPath);

      await Deno.remove(audioPath);

      return new Response(audioFile, {
        headers: {
          "Content-Type": "audio/wav",
          "Content-Disposition":
            `attachment; filename="${body.voice}_voice.wav"`,
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  }

  if (req.method === "GET" && url.pathname === "/voices") {
    const availableVoices = await getAvailableVoices();
    return new Response(
      JSON.stringify({ voices: availableVoices }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
    const availableVoices = await getAvailableVoices();
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Chatterbox Voice Synthesis API</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <h1 class="text-3xl font-bold text-gray-800 mb-2">Chatterbox Voice Synthesis API</h1>
    <p class="text-gray-600 mb-8">Generate realistic voice synthesis using AI</p>

    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Voice Synthesis</h2>
      <form id="voiceForm" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Text to synthesize</label>
          <textarea id="text" rows="3" required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter the text you want to convert to speech...">Hello, this is a test of the voice synthesis system.</textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Voice</label>
          <select id="voice" required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            ${
      availableVoices.map((v) => `<option value="${v}">${v}</option>`).join("")
    }
          </select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Exaggeration</label>
            <input type="number" id="exageration" step="any" min="0" max="2" value="0.5"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <p class="text-xs text-gray-500 mt-1">0 – 2, default 0.5</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">CFG Weight</label>
            <input type="number" id="cfg_weight" step="any" min="0" max="1" value="0.5"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <p class="text-xs text-gray-500 mt-1">0 – 1, default 0.5</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" id="split" class="rounded">
            Split long text
          </label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">Max chars/chunk:</span>
            <input type="number" id="split_chars" value="400" min="100" max="2000" step="50"
              class="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
        </div>

        <button type="submit"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
          Generate Voice
        </button>
      </form>
    </div>

    <div id="result" class="mt-6"></div>
  </div>

  <script>
  document.getElementById('voiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('text').value;
    const voice = document.getElementById('voice').value;
    const exageration = parseFloat(document.getElementById('exageration').value);
    const cfg_weight = parseFloat(document.getElementById('cfg_weight').value);
    const split = document.getElementById('split').checked;
    const split_chars = parseInt(document.getElementById('split_chars').value);

    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Generating...';
    submitBtn.disabled = true;

    document.getElementById('result').innerHTML =
      '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">' +
      '<span class="text-blue-800 font-medium">Generating voice... This may take 30-60 seconds per chunk</span>' +
      '</div>';

    try {
      const response = await fetch('/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, exageration, cfg_weight, split, split_chars })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        document.getElementById('result').innerHTML =
          '<div class="bg-green-50 border border-green-200 rounded-lg p-4">' +
          '<p class="text-green-800 font-medium mb-3">Voice generated!</p>' +
          '<audio controls class="w-full mb-3"><source src="' + url + '" type="audio/wav"></audio>' +
          '<a href="' + url + '" download="' + voice + '_voice.wav" ' +
          'class="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Download WAV</a>' +
          '</div>';
      } else {
        const error = await response.json();
        document.getElementById('result').innerHTML =
          '<div class="bg-red-50 border border-red-200 rounded-lg p-4">' +
          '<span class="text-red-800">Error: ' + error.error + '</span></div>';
      }
    } catch (error) {
      document.getElementById('result').innerHTML =
        '<div class="bg-red-50 border border-red-200 rounded-lg p-4">' +
        '<span class="text-red-800">Error: ' + error.message + '</span></div>';
    } finally {
      submitBtn.textContent = 'Generate Voice';
      submitBtn.disabled = false;
    }
  });
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html", ...corsHeaders },
    });
  }

  return new Response("Not Found", { status: 404 });
}

console.log(
  "Chatterbox voice synthesis server starting on http://localhost:8001",
);

const startupVoices = await getAvailableVoices();
console.log(
  "Available voices:",
  startupVoices.length
    ? startupVoices.join(", ")
    : "(none — add .wav files to references/)",
);

Deno.serve({ port: 8001 }, handler);
