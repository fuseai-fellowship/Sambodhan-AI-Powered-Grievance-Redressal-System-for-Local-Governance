import React from "react";

export function Skeleton({ width = "100%", height = "1.5rem", className = "" }) {
	return (
		<div
			className={`animate-pulse bg-gray-200 rounded ${className}`}
			style={{ width, height }}
		/>
	);
}
