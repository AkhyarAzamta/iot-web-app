import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// FeatureCard Component
export const FeatureCard = ({ 
  title, 
  description, 
  icon, 
  comingSoon = false, 
  note 
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  note?: string;
}) => (
  <Card className="hover:translate-y-[-5px] transition-all duration-300">
    {comingSoon && (
      <div className="absolute top-4 right-4">
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300">
          Coming Soon
        </span>
      </div>
    )}
    <CardHeader>
      <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-2 lg:mb-6">
        {icon}
      </div>
      <CardTitle className="text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-600 dark:text-gray-300 mb-3">{description}</p>
      {comingSoon && note && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-md border border-dashed border-gray-300 dark:border-slate-600">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">{note}</p>
        </div>
      )}
    </CardContent>
  </Card>
);

// RoadmapSection Component
export const RoadmapSection = () => (
  <div className="mt-20 bg-blue-50 dark:bg-slate-800 rounded-xl p-8 border border-blue-200 dark:border-slate-700">
    <div className="max-w-3xl mx-auto text-center">
      <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">Our Development Roadmap</h3>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        We&apos;re continuously working to bring you more powerful features. Here&apos;s what we&apos;re building next:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoadmapQuarter 
          quarter="Q2 2025" 
          items={[
            { text: "Real-Time Analytics", completed: true },
            { text: "Historical Data", completed: true },
            { text: "Mobile Alerts", completed: true }
          ]} 
        />
        <RoadmapQuarter 
          quarter="Q3 2025" 
          items={[
            { text: "Integration with Smart Feeders", completed: false },
            { text: "Maintenance Scheduling", completed: false }
          ]} 
        />
        <RoadmapQuarter 
          quarter="Q4 2025" 
          items={[
            { text: "AI-Powered Predictions", completed: false },
            { text: "Automated Reporting", completed: false }
          ]} 
        />
      </div>

      <Button variant="outline" className="mt-8 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
        Suggest a Feature
      </Button>
    </div>
  </div>
);

const RoadmapQuarter = ({ quarter, items }: { quarter: string; items: { text: string; completed: boolean }[] }) => (
  <div className="bg-white dark:bg-slate-700 p-5 px-4 rounded-lg shadow-sm">
    <div className="text-blue-600 dark:text-blue-400 font-bold mb-2">{quarter}</div>
    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start">
          {item.completed ? (
            <span className="text-green-500 mr-2">✓</span>
          ) : (
            <span className="text-gray-400 mr-2">•</span>
          )}
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  </div>
);

// HowItWorksStepCard Component
export const HowItWorksStepCard = ({ step, title, content }: { step: number; title: string; content: React.ReactNode }) => (
  <Card className="transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700">
    <CardHeader>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
          {step}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      {content}
    </CardContent>
  </Card>
);

// PricingCard Component
export const PricingCard = ({ 
  title, 
  description, 
  price, 
  features, 
  requirements, 
  tasks, 
  benefits, 
  buttonText, 
  popular = false, 
  premium = false 
}: {
  title: string;
  description: string;
  price: string;
  features: string[];
  requirements?: string[];
  tasks?: string[];
  benefits?: string[];
  buttonText: string;
  popular?: boolean;
  premium?: boolean;
}) => {
  const cardClasses = `
    rounded-xl shadow-lg overflow-hidden relative transform transition-all duration-300 
    hover:-translate-y-1 hover:shadow-xl
    ${premium 
      ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white' 
      : 'bg-white dark:bg-slate-800'
    }
    ${popular ? 'border-2 border-blue-500' : 'border border-blue-100 dark:border-slate-700'}
  `;

  return (
    <div className={cardClasses}>
      {popular && (
        <div className="absolute top-3 right-3">
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
            POPULAR
          </span>
        </div>
      )}
      
      {premium && (
        <div className="absolute top-3 right-3">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
            PREMIUM
          </span>
        </div>
      )}
      
      <div className="p-6 flex flex-col justify-between h-full">
        <div className="mb-5">
          <h3 className={`text-xl md:text-2xl font-bold mb-2 ${premium ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            {title}
          </h3>
          <p className={premium ? "text-blue-100" : "text-gray-600 dark:text-gray-300 text-sm md:text-base"}>
            {description}
          </p>
        </div>
        
        <div className="mb-6">
          <div className={`text-3xl md:text-4xl font-bold mb-1 ${premium ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            {price}
          </div>
          <p className={premium ? "text-blue-100 text-sm" : "text-gray-500 dark:text-gray-400 text-sm"}>
            {premium ? "One-time payment with 1 year warranty" : "One-time payment"}
          </p>
        </div>
        
        <div className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start">
              <svg 
                className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${premium ? 'text-white' : 'text-blue-500'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className={premium ? "text-blue-100 text-sm" : "text-gray-600 dark:text-gray-300 text-sm"}>
                {feature}
              </span>
            </div>
          ))}
        </div>
        
        {requirements && (
          <div className={`rounded-lg p-3 mb-5 ${premium ? 'bg-white/10 backdrop-blur-sm' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-700'}`}>
            <h4 className={`font-semibold mb-2 text-sm ${premium ? 'text-white' : 'text-yellow-800 dark:text-yellow-200'}`}>
              You Provide:
            </h4>
            <ul className={`text-xs space-y-1 ${premium ? 'text-blue-100' : 'text-yellow-700 dark:text-yellow-300'}`}>
              {requirements.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {tasks && (
          <div className={`rounded-lg p-3 mb-5 ${premium ? 'bg-white/10 backdrop-blur-sm' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'}`}>
            <h4 className={`font-semibold mb-2 text-sm ${premium ? 'text-white' : 'text-blue-800 dark:text-blue-200'}`}>
              What You Do:
            </h4>
            <ul className={`text-xs space-y-1 ${premium ? 'text-blue-100' : 'text-blue-700 dark:text-blue-300'}`}>
              {tasks.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {benefits && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-5">
            <h4 className="font-semibold mb-2 text-sm text-white">Ready to Use In:</h4>
            <ul className="text-xs space-y-1 text-blue-100">
              {benefits.map((item, index) => (
                <li key={index} className="flex items-center">
                  <svg className="h-4 w-4 text-green-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <Button className={`w-full text-sm md:text-base py-2 ${
          premium ? 'bg-white text-blue-600 hover:bg-gray-100 font-bold' : 
          popular ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' : 
          'bg-blue-600 hover:bg-blue-700'
        }`}>
          {buttonText}
        </Button>
      </div>
    </div>
  );
};