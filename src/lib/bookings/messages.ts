import type { TimeSlot } from "@/types/domain";

export const pendingSmsHy =
  "Ձեր հայտը ստացվել է և սպասում է բժշկի հաստատմանը։";

export const rescheduleSms = (slots: TimeSlot[]) =>
  [
    "Ձեր նախընտրած ժամը հասանելի չէ կամ փոփոխվել է։",
    "Կարող ենք առաջարկել հետևյալ ժամերը՝",
    ...slots.map(
      (slot, index) =>
        `${index + 1}. ${slot.date} ${slot.startTime}-${slot.endTime}`
    ),
    "Խնդրում ենք կապ հաստատել մեզ հետ՝ հարմար տարբերակը հաստատելու համար։"
  ].join("\n");
