import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  Gamepad2,
  Loader2,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function LocalVault() {
  const [localGames, setLocalGames] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initVault = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        setUserId(session.user.id);
        fetchCloudGames(session.user.id);
      }
    };
    initVault();
  }, []);

  const fetchCloudGames = async (uid: string) => {
    try {
      // List all files inside this user's specific folder in the bucket
      const { data, error } = await supabase.storage.from("web_roms").list(uid);

      if (error) throw error;

      // Filter out any hidden system files and map just the filenames
      if (data) {
        const gameFiles = data
          .filter((file) => file.name.endsWith(".nes"))
          .map((file) => file.name);
        setLocalGames(gameFiles);
      }
    } catch (err) {
      console.error("Could not fetch cloud games:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && userId) await uploadFile(file, userId);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && userId) await uploadFile(file, userId);
  };

  const uploadFile = async (file: File, uid: string) => {
    if (!file.name.toLowerCase().endsWith(".nes")) {
      alert("Only .nes files are supported!");
      return;
    }

    setIsUploading(true);

    try {
      // Upload directly to Supabase storage: bucketName, filePath, file
      const filePath = `${uid}/${file.name}`;
      const { error } = await supabase.storage
        .from("web_roms")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      await fetchCloudGames(uid);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload to Cloud Vault.");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteCloudGame = async (e: React.MouseEvent, filename: string) => {
    e.preventDefault();
    if (
      !userId ||
      !window.confirm(`Are you sure you want to delete ${filename}?`)
    )
      return;

    try {
      const filePath = `${userId}/${filename}`;
      const { error } = await supabase.storage
        .from("web_roms")
        .remove([filePath]);

      if (error) throw error;

      await fetchCloudGames(userId);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete game from Cloud Vault.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full min-h-screen">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-synth-primary transition-colors font-medium group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Library
        </Link>
      </div>

      <div className="mb-8 border-l-4 border-synth-secondary pl-3">
        <h2 className="text-3xl font-extrabold text-white drop-shadow-[0_0_12px_rgba(255,159,67,0.2)]">
          Cloud Vault
        </h2>
        <p className="text-gray-400 mt-1 flex items-center gap-2">
          Upload your personal ROMs to play instantly in the browser. Your files
          are securely isolated to your account.
        </p>
      </div>

      {/* THE DROPZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative mb-12 w-full h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
          isDragging
            ? "border-synth-primary bg-synth-primary/10 shadow-glow-primary"
            : "border-synth-border bg-synth-surface hover:border-synth-secondary/50"
        }`}
      >
        <input
          type="file"
          accept=".nes"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {isUploading ? (
          <Loader2 className="w-12 h-12 text-synth-primary animate-spin mb-4" />
        ) : (
          <UploadCloud
            className={`w-12 h-12 mb-4 transition-colors ${isDragging ? "text-synth-primary" : "text-gray-500"}`}
          />
        )}

        <h3 className="text-xl font-bold text-white mb-2">
          {isUploading ? "Uploading to Cloud..." : "Drag & Drop ROMs here"}
        </h3>
        <p className="text-sm text-gray-400">
          or click to browse your files (.nes only)
        </p>
      </div>

      {/* THE LOCAL GAME GRID */}
      {localGames.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-synth-surface rounded-xl border border-synth-border">
          <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-xl">Your cloud vault is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {localGames.map((filename) => (
            <Link
              key={filename}
              to={`/play/${filename}`}
              className="group relative block rounded-xl overflow-hidden bg-synth-surface border border-synth-border hover:border-synth-primary/55 hover:shadow-glow-primary-sm transition-all h-64"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-synth-bg via-synth-surface to-synth-primary/20 flex flex-col items-center justify-center p-4">
                <Gamepad2 className="w-16 h-16 text-synth-primary/40 group-hover:text-synth-primary group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,77,143,0.5)]" />
              </div>

              <button
                onClick={(e) => deleteCloudGame(e, filename)}
                className="absolute top-2 right-2 bg-synth-bg/85 border border-synth-border p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:border-red-500 hover:bg-red-500/20 focus:outline-none z-10 backdrop-blur-sm"
                title="Delete from Cloud"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400 transition-colors" />
              </button>

              <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-synth-bg via-synth-bg/92 to-transparent">
                <h3 className="font-bold text-sm md:text-md truncate text-white">
                  {filename.replace(".nes", "")}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
