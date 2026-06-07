import { memo } from "react";

export const SvgLockedSlot = memo(function SvgLockedSlot({ slot, pos, tw, th }) {
  return (
    <g key={"locked"+slot.num} opacity="0.45">
      <rect x={pos.cx-tw/2} y={pos.cy-th/2} width={tw} height={th}
        rx="8" fill="#ddd4c0" stroke="#b0a090" strokeWidth="1.2"
        strokeDasharray="5,3"/>
      <text x={pos.cx} y={pos.cy-4} textAnchor="middle"
        fontSize="13" fontFamily="sans-serif">🔒</text>
      <text x={pos.cx} y={pos.cy+10} textAnchor="middle"
        fontSize="7" fill="#8a7d6a" fontFamily="sans-serif">
        {slot.unlocksAt.icon} Niv.{slot.unlocksAt.l}
      </text>
    </g>
  );
});
