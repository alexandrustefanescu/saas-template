import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Body, PageTitle } from "#/components/typography";

type HeroSlide = {
  src: string;
  alt: string;
};

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  heroSlides?: HeroSlide[];
  /** @deprecated Prefer heroSlides — kept for single-image callers */
  heroImageSrc?: string;
  heroImageAlt?: string;
};

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    alt: "Person smiling while using a phone",
  },
  {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80",
    alt: "Students collaborating with laptops",
  },
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    alt: "Team collaborating around a table",
  },
];

const AUTOPLAY_MS = 5000;

const easeOut = [0.22, 1, 0.36, 1] as const;

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: easeOut },
  },
};

const stackVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
};

const slideImage = style({
  width: "full",
  height: "full",
  objectFit: "cover",
  position: "absolute",
  inset: 0,
  mixBlendMode: "luminosity",
});

const dotBase = style({
  height: 6,
  borderRadius: "full",
  backgroundColor: "white",
  borderStyle: "none",
  padding: 0,
  cursor: "pointer",
});

export function AuthPage({
  title,
  description,
  children,
  footer,
  heroSlides,
  heroImageSrc,
  heroImageAlt,
}: Props) {
  const reduceMotion = useReducedMotion();
  const slides =
    heroSlides ??
    (heroImageSrc
      ? [
          {
            src: heroImageSrc,
            alt: heroImageAlt ?? "Auth hero image",
          },
          ...DEFAULT_SLIDES.filter((slide) => slide.src !== heroImageSrc),
        ].slice(0, 3)
      : DEFAULT_SLIDES);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];

  useEffect(() => {
    if (slides.length < 2 || reduceMotion) return;

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [slides.length, reduceMotion]);

  return (
    <main
      className={style({
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingX: 16,
        paddingY: 32,
        minHeight: "screen",
        backgroundColor: "gray-100",
        boxSizing: "border-box",
      })}
    >
      <motion.div
        className={style({
          display: "flex",
          flexDirection: {
            default: "column",
            md: "row",
          },
          width: "full",
          maxWidth: 960,
          backgroundColor: "white",
          borderRadius: "xl",
          overflow: "hidden",
          boxShadow: "elevated",
        })}
        variants={cardVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.section
          className={style({
            display: "flex",
            flexDirection: "column",
            gap: 24,
            paddingX: {
              default: 24,
              sm: 40,
            },
            paddingY: {
              default: 32,
              sm: 40,
            },
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: {
              default: "auto",
              md: 0,
            },
            maxWidth: {
              default: "full",
              md: 480,
            },
          })}
          variants={stackVariants}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          <motion.div
            className={style({
              display: "flex",
              flexDirection: "column",
              gap: 8,
            })}
            variants={itemVariants}
          >
            <PageTitle>{title}</PageTitle>
            <Body>{description}</Body>
          </motion.div>

          <motion.div variants={itemVariants}>{children}</motion.div>
          {footer ? <motion.div variants={itemVariants}>{footer}</motion.div> : null}
        </motion.section>

        <motion.aside
          className={style({
            display: {
              default: "none",
              md: "flex",
            },
            flexDirection: "column",
            justifyContent: "end",
            alignItems: "center",
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            margin: 16,
            borderRadius: "xl",
            backgroundColor: "gray-900",
            overflow: "hidden",
            position: "relative",
            minHeight: 520,
          })}
          aria-roledescription="carousel"
          aria-label="Product highlights"
          initial={reduceMotion ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: easeOut, delay: 0.15 }}
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={activeSlide.src}
              src={activeSlide.src}
              alt={activeSlide.alt}
              className={slideImage}
              initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }}
              animate={{ opacity: 0.92, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.7, ease: easeOut }}
            />
          </AnimatePresence>
          <div
            className={style({
              position: "absolute",
              inset: 0,
              backgroundColor: "gray-900/40",
            })}
          />
          <div
            className={style({
              position: "relative",
              display: "flex",
              gap: 8,
              paddingBottom: 24,
              zIndex: 1,
            })}
            role="tablist"
            aria-label="Carousel slides"
          >
            {slides.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <motion.button
                  key={slide.src}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Show slide ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={dotBase}
                  animate={{
                    width: isActive ? 24 : 8,
                    opacity: isActive ? 1 : 0.45,
                  }}
                  transition={{ duration: 0.28, ease: easeOut }}
                  whileHover={reduceMotion ? undefined : { opacity: 0.85 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                />
              );
            })}
          </div>
        </motion.aside>
      </motion.div>
    </main>
  );
}
