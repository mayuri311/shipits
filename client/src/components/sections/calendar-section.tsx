import { ParallaxSection } from "@/components/ui/parallax-section";
import { MapPin } from "lucide-react";

const mockEvents = [
  {
    id: "1",
    title: "Hackathon Kickoff",
    description: "Join us for the start of our 48-hour innovation challenge. Teams, prizes, and endless possibilities await.",
    date: new Date("2024-11-15"),
    time: "6:00 PM",
    location: "Gates Hillman Center"
  },
  {
    id: "2", 
    title: "Demo Night",
    description: "Showcase your latest projects to the community. Get feedback, network, and celebrate innovation.",
    date: new Date("2024-11-22"),
    time: "7:30 PM",
    location: "Wean Hall Auditorium"
  },
  {
    id: "3",
    title: "Workshop Series", 
    description: "Learn cutting-edge technologies from industry experts and fellow students in our hands-on workshop.",
    date: new Date("2024-12-05"),
    time: "5:00 PM",
    location: "Hunt Library Collaboration Space"
  }
];

export function CalendarSection() {
  const formatDate = (date: Date) => {
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate()
    };
  };

  return (
    <section id="calendar" className="relative py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Upcoming Events</h2>
            <p className="text-xl text-gray-600">Stay connected with the Ship Its community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockEvents.map((event) => {
              const { month, day } = formatDate(event.date);
              return (
                <div 
                  key={event.id}
                  className="bg-white border-2 border-gray-200 p-6 hover:border-maroon transition-colors duration-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-maroon text-white p-3 text-center min-w-16">
                      <div className="text-sm font-medium">{month}</div>
                      <div className="text-2xl font-bold">{day}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">{event.time}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-maroon transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{event.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="mr-2" size={16} />
                    {event.location}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <button className="border-2 border-maroon text-maroon px-8 py-3 hover:bg-maroon hover:text-white transition-all duration-300 font-medium tracking-wide">
              VIEW ALL EVENTS
            </button>
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
