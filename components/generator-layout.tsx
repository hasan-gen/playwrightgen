"use client";

import { useState, type ReactNode } from "react";
import GeneratorSidebar from "./generator-sidebar";

type SidebarHistoryItem = {
    id: string;
    mode: "text" | "html" | "api" | "component";
    prompt: string;
    url: string;
    generatedCode: string;
    createdAt: string;
    styleMode: "fast" | "clean" | "production";
    outputType: "playwright" | "unit";
    generationType: "prompt" | "url";
};

type Props = {
    children: ReactNode;
    sidebarProps: {
        historyItems: SidebarHistoryItem[];
        selectedHistoryId: string | null;
        onSelect: (item: SidebarHistoryItem) => void;
        onNew: () => void;
        onClear: () => void;
        onDelete: (id: string) => void;
        onLogout: () => void;
        userEmail: string;
        isProVerified: boolean;
        remainingGenerations: number;
        hasSyncedUsage: boolean;
        freeDailyGenerations: number;
    };
};

export default function GeneratorLayout({
    children,
    sidebarProps,
}: Props) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-[hashtag#fafafa] text-black">
            <div className="flex h-screen overflow-hidden">
                {sidebarOpen && <GeneratorSidebar {...sidebarProps} />}

                <div className="relative flex-1 overflow-y-auto">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        className="absolute left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg shadow-sm transition hover:bg-gray-50"
                        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        {sidebarOpen ? "🔴" : "🟢"}
                    </button>

                    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}