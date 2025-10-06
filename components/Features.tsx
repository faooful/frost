export function Features() {
  const features = [
    {
      title: "Fast & Modern",
      description: "Built with Next.js 14 and the latest React features for optimal performance.",
      icon: ""
    },
    {
      title: "Type Safe",
      description: "Full TypeScript support for better developer experience and fewer bugs.",
      icon: ""
    },
    {
      title: "Beautiful UI",
      description: "Modern design with Tailwind CSS and responsive layouts.",
      icon: ""
    },
    {
      title: "Developer Friendly",
      description: "Hot reload, ESLint, and all the tools you need for efficient development.",
      icon: ""
    }
  ]

  return (
    <section className="py-20 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose Frost?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Experience the power of modern web development with our carefully crafted features.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-effect p-8 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
