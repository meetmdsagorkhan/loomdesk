"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle, X } from "lucide-react";

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}

export function CheckOutModal({ isOpen, onClose, onConfirm }: CheckOutModalProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError("Please provide a note describing your work.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onConfirm(note);
      setNote("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to check out");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Complete Check Out</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6 space-y-2">
                <p className="text-gray-400">
                  Please summarize what you accomplished during this session. This note is mandatory for checking out.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <textarea
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      if (e.target.value.trim()) setError("");
                    }}
                    placeholder="E.g., Resolved 5 support tickets, attended weekly sync..."
                    className="w-full h-32 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
                    disabled={isSubmitting}
                  />
                  {error && (
                    <div className="mt-2 flex items-center text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !note.trim()}
                    className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Confirm Check Out
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
