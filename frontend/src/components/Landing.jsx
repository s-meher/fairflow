import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, Waves, Users, Shield, TrendingUp, Clock, Lock, Sparkles } from 'lucide-react';

const features = [
  {
    title: 'Community Pools',
    copy: 'Local neighbors pool resources—no sharks, just neighbors supporting neighbors.',
    icon: <Users className="h-6 w-6" />,
    color: 'from-cyan-400 to-blue-500',
  },
  {
    title: 'Clear Waters',
    copy: 'Transparent risk scoring shows exactly where you stand before any commitment.',
    icon: <Shield className="h-6 w-6" />,
    color: 'from-teal-400 to-cyan-500',
  },
  {
    title: 'Ripple Effect',
    copy: 'Watch your impact ripple across your neighborhood—every loan strengthens the ecosystem.',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'from-blue-400 to-indigo-500',
  },
];

const stats = [
  { label: 'Fair rates', value: '0–5%', icon: <TrendingUp className="h-6 w-6" />, color: 'from-emerald-400 to-teal-500' },
  { label: 'Quick start', value: '< 5min', icon: <Clock className="h-6 w-6" />, color: 'from-cyan-400 to-blue-500' },
  { label: 'Privacy first', value: '100%', icon: <Lock className="h-6 w-6" />, color: 'from-blue-400 to-purple-500' },
];

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

const float = {
  y: [0, -15, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full">
      <div className="container relative mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={container}
          className="mb-20 text-center"
        >
          {/* Floating badge */}
          <motion.div variants={item} className="mb-8 inline-block">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-6 py-2 backdrop-blur-xl border border-white/30">
              <Waves className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-bold text-cyan-700">Community Beta</span>
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
          </motion.div>
          
          {/* Main Title */}
          <motion.div variants={item}>
            <motion.h1 
              animate={float}
              className="mb-6 text-7xl md:text-8xl font-black tracking-tight"
            >
              <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                Symbio
              </span>
            </motion.h1>
          </motion.div>
          
          {/* Subtitle */}
          <motion.div variants={item} className="mx-auto max-w-3xl">
            <p className="mb-3 text-lg md:text-xl font-semibold text-primary/90">
              Fair lending. No sharks.
            </p>
            <p className="mb-4 text-2xl md:text-3xl font-bold text-primary">
              Dive into fair lending
            </p>
            <p className="mb-12 text-lg md:text-xl text-foreground/80 leading-relaxed">
              Borrow safely, lend with confidence. Keep wealth rooted in your community—
              <span className="font-bold text-primary"> no predatory rates, no hidden terms.</span>
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-5 mb-16">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  className="group min-w-[200px]"
                  onClick={() => navigate('/scan-id')}
                >
                  <span className="relative z-10">Dive In</span>
                  <ArrowRight className="relative z-10 ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="min-w-[200px]"
                  onClick={() => navigate('/feed')}
                >
                  <Waves className="mr-2 h-5 w-5" />
                  Community Flow
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline"
                  size="lg" 
                  className="min-w-[200px]"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Stats Cards */}
          <motion.div 
            variants={container}
            className="mx-auto grid max-w-4xl grid-cols-1 sm:grid-cols-3 gap-6 mb-24"
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label}
                variants={item}
                whileHover={{ y: -8, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="p-6 text-center">
                  <motion.div 
                    className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${stat.color} text-white shadow-lg`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {stat.icon}
                  </motion.div>
                  <h3 className="mb-2 text-4xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    {stat.value}
                  </h3>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-6xl mb-24"
        >
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl md:text-5xl font-black text-primary">
              Why Symbio Works
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Built for real people, powered by community trust
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                whileHover={{ y: -12 }}
              >
                <Card className="group h-full p-8 transition-all duration-300">
                  <motion.div 
                    className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className="mb-3 text-2xl font-bold text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {feature.copy}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden"
        >
          <Card className="relative p-12 md:p-16 text-center bg-gradient-to-br from-cyan-500 to-blue-600">
            <div className="relative z-10">
              <motion.div
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <h2 className="mb-4 text-4xl md:text-5xl font-black text-white">
                  Ready to Make Waves?
                </h2>
              </motion.div>
              <p className="mb-8 text-xl text-cyan-50 max-w-2xl mx-auto">
                Join your community's financial ecosystem. Start borrowing or lending today.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 hover:shadow-2xl min-w-[220px]"
                  onClick={() => navigate('/scan-id')}
                >
                  <span className="font-black">Get Started</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
            
            {/* Decorative wave pattern */}
            <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,0 C300,60 600,60 900,0 L1200,0 L1200,120 L0,120 Z" fill="white" opacity="0.3"/>
                <path d="M0,20 C300,80 600,80 900,20 L1200,20 L1200,120 L0,120 Z" fill="white" opacity="0.2"/>
              </svg>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
