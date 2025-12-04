"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

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
  const [mounted, setMounted] = useState(false);
  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });
  const display = useTransform(spring, (current) =>
    current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  );

  useEffect(() => {
    setMounted(true);
    if (mounted) {
      spring.set(value);
    }
  }, [value, mounted, spring]);

  return (
    <span className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
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
