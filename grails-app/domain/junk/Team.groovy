package junk

class Team {
    String name
    List players

    static hasMany = [players : Player]

    static mapping = {
        players cascade:"all-delete-orphan"
    }
}
