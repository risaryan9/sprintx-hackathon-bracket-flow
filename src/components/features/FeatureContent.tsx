import { motion } from "framer-motion";

interface FeatureContentProps {
  image: string;
  title: string;
  description: string;
}

export const FeatureContent = ({ image, title, description }: FeatureContentProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col gap-8"
    >
      <div className="glass rounded-2xl overflow-hidden w-full relative aspect-video">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover object-center relative z-10"
        />
      </div>
      <div className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary">Overview</p>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};