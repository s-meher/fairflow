import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Users, BarChart2, TrendingUp, Clock, Lock } from 'lucide-react';

const features = [
  {
    title: 'Community-backed capital',
    copy: 'Neighbors pool funds so borrowers skip predatory rates and keep savings local.',
    icon: <Users className="h-5 w-5 text-teal-600" />,
  },
  {
    title: 'Transparent risk gauge',
    copy: 'Every request gets a score + advice before matching with lenders.',
    icon: <BarChart2 className="h-5 w-5 text-teal-600" />,
  },
  {
    title: 'Shareable impact',
    copy: 'Opt in to the feed and show how fair lending cycles money through Princeton.',
    icon: <TrendingUp className="h-5 w-5 text-teal-600" />,
  },
];

const stats = [
  { label: 'Community rates', value: '0%–5%', icon: <TrendingUp className="h-5 w-5" /> },
  { label: 'Scan to pre-check', value: 'Minutes', icon: <Clock className="h-5 w-5" /> },
  { label: 'Data stays local', value: '100%', icon: <Lock className="h-5 w-5" /> },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 md:py-24">
        {/* Hero Section */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="text-center mb-20"
        >
          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100">
            <Shield className="mr-2 h-4 w-4" />
            Hyper-local beta
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
            Symbio
          </h1>
          
          <div className="max-w-2xl mx-auto
          ">
            <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
              Fair lending. <span className="font-semibold text-teal-600">No sharks.</span>
            </p>
            <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
              Borrow safely, lend with confidence, and keep wealth circulating inside the Princeton
              community—no sharks, no surprise terms.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg font-medium bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 transition-all duration-300 transform hover:-translate-y-1"
                onClick={() => navigate('/scan-id')}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-6 text-lg font-medium border-2 hover:bg-teal-50 transition-all duration-300"
                onClick={() => navigate('/feed')}
              >
                See community feed
              </Button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-teal-50 text-teal-600 mb-4 mx-auto">
                  {stat.icon}
                </div>
                <h3 className="text-3xl font-bold text-center mb-2 text-gray-900">{stat.value}</h3>
                <p className="text-sm font-medium text-center text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why people choose Symbio</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A better way to manage finances within your community
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-24">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:border-teal-100"
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-teal-50 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.copy}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-8 md:p-12 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to join the community?</h2>
          <p className="text-teal-100 text-lg mb-8 max-w-2xl mx-auto">
            Start borrowing or lending today and be part of Princeton's fair financial ecosystem.
          </p>
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg font-medium bg-white text-teal-600 hover:bg-gray-100 transition-all duration-300"
            onClick={() => navigate('/scan-id')}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
