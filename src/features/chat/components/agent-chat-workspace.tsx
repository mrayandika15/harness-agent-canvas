"use client";

import { motion } from "framer-motion";
import { ArrowUp, Paperclip } from "lucide-react";

import { PanelCard } from "@/components/app/panel-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { conversationSeed } from "@/features/chat/lib/conversation-seed";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function AgentChatWorkspace() {
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const selectedAgentName = useWorkspaceStore((state) => state.selectedAgentName);

  const selectedAgent =
    agentItems.find((agent) => agent.name === selectedAgentName) ?? agentItems[0];

  return (
    <section className="flex min-h-0 flex-1 bg-[rgba(5,5,5,0.82)]">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6 pb-[34vh]">
            {conversationSeed.map((message) => (
              <PanelCard
                key={message.id}
                className={
                  message.role === "assistant"
                    ? "mr-20 p-5"
                    : "ml-20 border-[rgba(245,148,78,0.14)] bg-[linear-gradient(180deg,rgba(54,29,15,0.3),rgba(16,12,10,0.94))] p-5"
                }
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  {message.role === "assistant" ? "Assistant" : "You"}
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                  {message.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/58">{message.body}</p>
              </PanelCard>
            ))}
          </div>
        </ScrollArea>

        <div className="pointer-events-none absolute inset-x-0 bottom-[3vh] z-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 72 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto mx-auto w-full max-w-4xl"
          >
            <PanelCard className="rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(8,8,8,0.97))] p-4 shadow-[0_24px_96px_rgba(0,0,0,0.38)]">
              <Textarea
                placeholder={`Message ${selectedAgent.name} about the current flow...`}
                className="min-h-[92px] resize-none rounded-[20px] border-0 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(8,8,8,0.97))] px-4 py-3 text-[16px] leading-6 text-white/84 placeholder:text-white/28 shadow-none focus-visible:border-0 focus-visible:ring-0"
              />

              <div className="mt-3 flex items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-[40px] w-[40px] rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] text-white/62 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                  >
                    <Paperclip className="h-4.5 w-4.5" />
                  </Button>
                </div>

                <Button
                  variant="default"
                  className="h-[40px] rounded-full border border-[rgba(196,112,52,0.56)] bg-[linear-gradient(180deg,#5c3118,#4b2612)] px-4 text-[13px] font-semibold text-[#f8ede6] shadow-[inset_0_1px_0_rgba(255,206,178,0.12)] hover:bg-[linear-gradient(180deg,#6a391d,#572c16)]"
                >
                  <ArrowUp className="h-3 w-3" />
                  Send
                </Button>
              </div>
            </PanelCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
