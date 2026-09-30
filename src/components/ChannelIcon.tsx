import { MessageCircle, MessageSquareText, PhoneCall, Send } from "lucide-react";
import { CHANNEL_LABELS } from "@/lib/messaging/channels";
import type { MessageChannel } from "@/types/domain";

// Generic icons in each service's brand colour (lucide has no brand logos).
const channelStyle: Record<MessageChannel, { Icon: typeof Send; color: string; bg: string }> = {
  sms: { Icon: MessageSquareText, color: "text-slate-700", bg: "bg-slate-100" },
  whatsapp: { Icon: MessageCircle, color: "text-[#1E9E55]", bg: "bg-[#E7F7EE]" },
  viber: { Icon: PhoneCall, color: "text-[#7360F2]", bg: "bg-[#EFEDFE]" },
  telegram: { Icon: Send, color: "text-[#229ED9]", bg: "bg-[#E6F4FB]" }
};

export function ChannelIcon({
  channel,
  className = "h-4 w-4"
}: {
  channel: MessageChannel;
  className?: string;
}) {
  const { Icon, color } = channelStyle[channel];
  return <Icon className={`${className} ${color}`} aria-hidden="true" />;
}

/** Small pill: icon + channel name. */
export function ChannelBadge({ channel }: { channel: MessageChannel }) {
  const { bg } = channelStyle[channel];
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink ${bg}`}
      data-testid={`channel-badge-${channel}`}
    >
      <ChannelIcon channel={channel} className="h-3.5 w-3.5" />
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

/** Four buttons to choose a channel; used on the landing page and in the admin. */
export function ChannelPicker({
  value,
  onChange,
  tone = "light",
  name = "channel"
}: {
  value: MessageChannel;
  onChange: (channel: MessageChannel) => void;
  tone?: "light" | "dark";
  name?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
      {(Object.keys(channelStyle) as MessageChannel[]).map((channel) => {
        const selected = channel === value;
        return (
          <button
            key={channel}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(channel)}
            data-testid={`${name}-${channel}`}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${
              selected
                ? "border-ink bg-white text-ink shadow-soft ring-2 ring-ink"
                : tone === "dark"
                  ? "border-champagne/60 bg-porcelain text-ink hover:border-ink/40"
                  : "border-champagne/70 bg-white text-ink hover:border-ink/40"
            }`}
          >
            <ChannelIcon channel={channel} className="h-5 w-5" />
            {CHANNEL_LABELS[channel]}
          </button>
        );
      })}
    </div>
  );
}
