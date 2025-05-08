//
//  CountDownEvent.swift
//  countdown-widgets
//
//  Created by Ying XU on 2025-03-14.
//

import Foundation

struct CountDownEvent: Codable, Identifiable, Equatable {
    // Codable: tell swift your type can be converted to/from a format such as json
    // Identifiable: can use id property
    // Equatble: can use == to compare
    let event: String
    let date: Date
    let id: Int
}
