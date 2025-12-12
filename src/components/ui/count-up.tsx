"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type CountUpProps = {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

export function CountUp({
  value,
  duration = 0.8,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const startValue = displayValue;
    const endValue = value;
    const animationDuration = duration * 1000;
    const startTime = Date.now();

    const updateValue = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function (ease out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easedProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };

    requestAnimationFrame(updateValue);
  }, [value, mounted, duration, displayValue]);

  const formattedValue = displayValue
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (
    <span className={className}>
      {prefix}
      <span>{formattedValue}</span>
      {suffix}
    </span>
  );
}

type AnimatedNumberProps = {
  value: number;
  format?: (val: number) => string;
  className?: string;
};

export function AnimatedNumber({
  value,
  format,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const duration = 800;
    const steps = 60;
    const stepValue = (value - displayValue) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => prev + stepValue);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, mounted, displayValue]);

  const formattedValue = format ? format(displayValue) : displayValue.toFixed(0);

  return <span className={className}>{formattedValue}</span>;
}
