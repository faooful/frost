export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full bg-gradient-to-br from-blue-100/20 to-purple-100/20"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="gradient-text">Frost</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              A modern, beautiful Next.js application built with the latest technologies and best practices.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="btn-primary">
              Get Started
            </button>
            <button className="btn-secondary">
              Learn More
            </button>
          </div>
          
          <div className="pt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Built with Next.js 14, TypeScript, and Tailwind CSS
            </p>
          </div>
        </div>
      </div>
      
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-5 w-16 h-16 bg-pink-400 rounded-full opacity-20 animate-pulse delay-500"></div>
    </section>
  )
}
