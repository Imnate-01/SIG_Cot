"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, FilePlus, LayoutDashboard, ShieldCheck, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuthMigration } from "@/hooks/useAuthMigration";

// --- Mismas keywords que Sidebar y Login para consistencia ---
const ASEPTICO_KEYWORDS = [
  'aseptic', 'aséptic',
  'calidad',
  'ingeniero', 'engineer',
  'intern',
];

function esRolAseptico(rol?: string, departamento?: string): boolean {
  const rolLower  = (rol          || '').toLowerCase();
  const deptLower = (departamento || '').toLowerCase();
  return ASEPTICO_KEYWORDS.some(
    (kw) => rolLower.includes(kw) || deptLower.includes(kw)
  );
}

// --- Tooltip position types ---
type TooltipPosition = "right" | "bottom" | "center";

interface TourStep {
  targetSelector: string | null; // CSS selector to highlight, null = centered modal
  title: string;
  description: string;
  icon: React.ReactNode;
  position: TooltipPosition;
  action?: () => void; // Optional guided action
  actionLabel?: string;
}

export default function Onboarding() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const { userData } = useAuthMigration();

  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const userName = userData?.nombre?.split(" ")[0] || "";
  const esAseptico = esRolAseptico(userData?.rol, userData?.departamento);

  // Clave de localStorage según el grupo, para que cada rol tenga su propio estado
  const STORAGE_KEY = esAseptico ? "onboarding_fsa_completed" : "onboarding_completed";

  // --- Pasos para usuarios de Cotizaciones (Ventas / Admin) ---
  const commercialSteps: TourStep[] = [
    {
      targetSelector: null,
      title: t("step1Title"),
      description: t("step1Desc"),
      icon: <Sparkles size={32} className="text-sig-blue" />,
      position: "center"
    },
    {
      targetSelector: 'a[href*="/cotizaciones"]:not([href*="nueva"]):not([href*="editar"])',
      title: t("step2Title"),
      description: t("step2Desc"),
      icon: <LayoutDashboard size={24} className="text-sig-blue" />,
      position: "right"
    },
    {
      targetSelector: 'a[href*="/cotizaciones/nueva"]',
      title: t("step3Title"),
      description: t("step3Desc"),
      icon: <FilePlus size={24} className="text-sig-blue" />,
      position: "right",
      action: () => router.push("/cotizaciones/nueva"),
      actionLabel: t("step3Action")
    },
    {
      targetSelector: 'a[href*="/clientes"]',
      title: t("step4Title"),
      description: t("step4Desc"),
      icon: <LayoutDashboard size={24} className="text-sig-blue" />,
      position: "right"
    },
    {
      targetSelector: null,
      title: userName ? t("step5Title", { name: userName }) : t("step5TitleGeneric"),
      description: t("step5Desc"),
      icon: <Rocket size={32} className="text-sig-blue" />,
      position: "center"
    }
  ];

  // --- Pasos para usuarios de Ingeniería Aséptica / FSA ---
  const fsaSteps: TourStep[] = [
    {
      targetSelector: null,
      title: t("fsa_step1Title"),
      description: t("fsa_step1Desc"),
      icon: <Sparkles size={32} className="text-sig-blue" />,
      position: "center"
    },
    {
      targetSelector: 'a[href*="/food-safety-audit"]:not([href*="nuevo"]):not([href*="editar"])',
      title: t("fsa_step2Title"),
      description: t("fsa_step2Desc"),
      icon: <ShieldCheck size={24} className="text-sig-blue" />,
      position: "right"
    },
    {
      targetSelector: 'a[href*="/food-safety-audit/nuevo"]',
      title: t("fsa_step3Title"),
      description: t("fsa_step3Desc"),
      icon: <FilePlus size={24} className="text-sig-blue" />,
      position: "right",
      action: () => router.push("/food-safety-audit/nuevo"),
      actionLabel: t("fsa_step3Action")
    },
    {
      targetSelector: null,
      title: userName ? t("fsa_step4Title", { name: userName }) : t("fsa_step4TitleGeneric"),
      description: t("fsa_step4Desc"),
      icon: <Rocket size={32} className="text-sig-blue" />,
      position: "center"
    }
  ];

  const steps: TourStep[] = esAseptico ? fsaSteps : commercialSteps;

  const totalSteps = steps.length;
  const currentStep = steps[step];
  const progress = ((step + 1) / totalSteps) * 100;

  // --- Measure target element ---
  const measureTarget = useCallback(() => {
    const selector = steps[step]?.targetSelector;
    if (!selector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // --- Show on mount ---
  useEffect(() => {
    const tourVisto = localStorage.getItem(STORAGE_KEY);
    if (!tourVisto) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [STORAGE_KEY]);

  // --- Re-measure on step change and resize ---
  useEffect(() => {
    if (!isVisible) return;
    measureTarget();
    const handleResize = () => measureTarget();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isVisible, step, measureTarget]);

  // --- Navigation ---
  const handleNext = () => {
    if (step < totalSteps - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setStep(step + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setStep(step - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!isVisible) return null;

  // --- Calculate tooltip position ---
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || currentStep.position === "center") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }

    if (currentStep.position === "right") {
      return {
        position: "fixed",
        top: Math.max(16, Math.min(targetRect.top - 20, window.innerHeight - 380)),
        left: targetRect.right + 20,
      };
    }

    // bottom
    return {
      position: "fixed",
      top: targetRect.bottom + 16,
      left: Math.max(16, targetRect.left),
    };
  };

  // --- Spotlight cutout for highlighted element ---
  const renderSpotlight = () => {
    if (!targetRect) return null;
    const padding = 6;
    return (
      <div
        className="fixed z-[101] rounded-xl border-2 border-sig-blue pointer-events-none transition-all duration-500 ease-out"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 30px 4px rgba(20,94,252,0.35)",
        }}
      />
    );
  };

  const isCentered = currentStep.position === "center";

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop — only full overlay on centered steps */}
      {isCentered && (
        <div
          className="absolute inset-0 bg-black/65 transition-opacity duration-500"
          onClick={handleClose}
        />
      )}

      {/* Spotlight overlay on targeted steps */}
      {!isCentered && renderSpotlight()}

      {/* Progress bar at top */}
      <div className="fixed top-0 left-0 right-0 z-[110] h-1 bg-black/20">
        <div
          className={`h-full bg-sig-blue transition-all duration-700 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`z-[110] transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
        style={getTooltipStyle()}
      >
        <div className={`bg-white dark:bg-zinc-900 rounded-md shadow-xl overflow-hidden border border-sig-line dark:border-zinc-700 ${isCentered ? "w-[min(460px,90vw)]" : "w-[min(380px,85vw)]"}`}>

          {/* Colored header */}
          <div className={`bg-sig-sand dark:bg-zinc-800 border-b border-sig-line dark:border-zinc-700 px-6 ${isCentered ? "py-8" : "py-5"} relative`}>

            <div className="relative z-10 flex items-center gap-4">
              <div className={`${isCentered ? "w-14 h-14" : "w-10 h-10"} bg-white dark:bg-zinc-900 border border-sig-line dark:border-zinc-700 rounded flex items-center justify-center flex-shrink-0`}>
                {currentStep.icon}
              </div>
              <div>
                <h2 className={`font-bold text-black dark:text-white ${isCentered ? "text-xl" : "text-base"} leading-tight`}>
                  {currentStep.title}
                </h2>
                <p className="text-sig-muted text-xs mt-0.5">
                  {t("stepOf", { current: step + 1, total: totalSteps })}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 text-sig-muted hover:text-black hover:bg-white rounded transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <div className={`px-6 ${isCentered ? "py-6" : "py-4"}`}>
            <p className={`text-gray-600 dark:text-gray-300 leading-relaxed ${isCentered ? "text-base" : "text-sm"}`}>
              {currentStep.description}
            </p>

            {/* Guided action button */}
            {currentStep.action && currentStep.actionLabel && (
              <button
                onClick={() => {
                  currentStep.action?.();
                  handleClose();
                }}
                className={`mt-4 w-full py-2.5 rounded text-white font-semibold text-sm bg-sig-blue hover:bg-sig-blue-hover transition-colors flex items-center justify-center gap-2`}
              >
                {currentStep.actionLabel}
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Footer with progress dots + navigation */}
          <div className="px-6 pb-5 flex items-center justify-between">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIsAnimating(true);
                    setTimeout(() => {
                      setStep(i);
                      setIsAnimating(false);
                    }, 200);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    i === step
                      ? `w-6 h-2 bg-sig-blue`
                      : i < step
                        ? "w-2 h-2 bg-blue-300 dark:bg-blue-600"
                        : "w-2 h-2 bg-gray-200 dark:bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {step < totalSteps - 1 ? (
                <button
                  onClick={handleNext}
                  className={`px-4 py-2 rounded text-white font-semibold text-sm bg-sig-blue hover:bg-sig-blue-hover transition-colors flex items-center gap-1.5`}
                >
                  {t("btnNext")}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className={`px-5 py-2.5 rounded text-white font-semibold text-sm bg-sig-blue hover:bg-sig-blue-hover transition-colors`}
                >
                  {t("btnStart")}
                </button>
              )}
            </div>
          </div>

          {/* Skip link */}
          {step < totalSteps - 1 && (
            <div className="pb-4 text-center">
              <button
                onClick={handleClose}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors"
              >
                {t("btnSkip")}
              </button>
            </div>
          )}
        </div>

        {/* Pointer arrow for non-centered tooltips */}
        {!isCentered && targetRect && currentStep.position === "right" && (
          <div
            className="fixed z-[109] w-3 h-3 bg-white dark:bg-zinc-900 rotate-45 border-l border-b border-gray-200/50 dark:border-zinc-700/50"
            style={{
              top: targetRect.top + targetRect.height / 2 - 6,
              left: targetRect.right + 14,
            }}
          />
        )}
      </div>
    </div>
  );
}