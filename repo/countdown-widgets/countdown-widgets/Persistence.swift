//
//  Persistence.swift
//  countdown-widgets
//
//  Created by Ying XU on 2025-03-14.
//

import Foundation


private let eventsKey = "countdownEvents"

func saveEvents(_ events: [CountDownEvent]) {
    let data = try! JSONEncoder().encode(events)
    UserDefaults.standard.set(data, forKey: eventsKey)
}

func loadEvents() -> [CountDownEvent] {
    guard let data = UserDefaults.standard.data(forKey: eventsKey) else {
        return []
    }
    return try! JSONDecoder().decode([CountDownEvent].self, from: data)
}


