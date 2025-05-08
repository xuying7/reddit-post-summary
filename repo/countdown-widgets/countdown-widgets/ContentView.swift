//
//  ContentView.swift
//  countdown-widgets
//
//  Created by Ying XU on 2025-03-14.
//

import SwiftUI

struct ContentView: View {
    @State private var events: [CountDownEvent] = []
    
    @State private var newEventName: String = ""
    @State private var newEventDate: Date = Date()
    
    func daysLeft(until date: Date) -> Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: Date(), to: date)
        return components.day ?? 0
    }
    
    var body: some View {
        VStack(spacing: 16) {
            TextField("New Event Name", text: $newEventName)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding(.horizontal)
            
            DatePicker("New Event Date", selection: $newEventDate, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .padding(.horizontal)
            
            Button("Add Event") {
                let newEvert = CountDownEvent(
                    event: newEventName,
                    date: newEventDate,
                    id: Int.random(in: 1...9999)
                )
                events.append(newEvert)
                saveEvents(events)
                
            }
            .buttonStyle(.borderedProminent)
            
            List(events) { event in
                VStack(alignment: .leading) {
                    Text("Name: \(event.event)")
                    Text("Date: \(event.date.formatted())")
                    Text("Days Left: \(daysLeft(until: event.date))")
                }
            }
            .onAppear {
                events = loadEvents()
            }
            
            
            
        }
    }
    
}
    
    struct ContentView_Previews: PreviewProvider {
        static var previews: some View {
            ContentView()
        }
    }

