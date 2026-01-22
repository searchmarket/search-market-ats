import { GraduationCap, PlayCircle, BookOpen, Award, Clock } from 'lucide-react'

export default function SchoolPage() {
  const courses = [
    {
      title: 'Getting Started with Search Market',
      description: 'Learn the basics of the platform and how to set up your profile.',
      duration: '15 min',
      lessons: 4,
      status: 'available',
    },
    {
      title: 'Client Acquisition Mastery',
      description: 'Strategies for finding and signing new clients.',
      duration: '45 min',
      lessons: 8,
      status: 'coming_soon',
    },
    {
      title: 'AI-Powered Sourcing',
      description: 'How to use AI tools to find candidates faster.',
      duration: '30 min',
      lessons: 6,
      status: 'coming_soon',
    },
    {
      title: 'Contract Negotiation',
      description: 'Master the art of negotiating placement fees and contract terms.',
      duration: '40 min',
      lessons: 7,
      status: 'coming_soon',
    },
    {
      title: 'Building Long-Term Client Relationships',
      description: 'Turn one-time clients into repeat business.',
      duration: '35 min',
      lessons: 6,
      status: 'coming_soon',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recruiter School</h1>
        <p className="text-gray-500 mt-1">Free training to level up your recruiting skills</p>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-r from-brand-navy to-brand-blue rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Your Progress</h2>
            <p className="text-white/80">You&apos;ve completed 0 of 5 courses</p>
            <div className="mt-4 w-64 bg-white/20 rounded-full h-2">
              <div className="bg-brand-green h-2 rounded-full w-0"></div>
            </div>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <Award className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${course.status === 'coming_soon' ? 'opacity-75' : ''}`}
          >
            <div className="bg-gradient-to-r from-brand-green to-emerald-600 p-8 flex items-center justify-center">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                {course.status === 'coming_soon' && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
              <p className="text-gray-500 text-sm mb-4">{course.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {course.lessons} lessons
                </div>
              </div>
              <button 
                disabled={course.status === 'coming_soon'}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
                  course.status === 'coming_soon' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-brand-navy text-white hover:bg-brand-blue'
                }`}
              >
                <PlayCircle className="w-5 h-5" />
                {course.status === 'coming_soon' ? 'Coming Soon' : 'Start Course'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
