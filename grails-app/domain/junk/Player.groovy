package junk

class Player {
    String firstName
    String lastName
    String position

    boolean deleted
    static transients = [ 'deleted' ]

    static belongsTo = [team : Team]

    static constraints = {
        firstName(blank: false)
        lastName(blank: false)
        position(blank: false)
    }

    String toString() {
        "id=$id : ${firstName} $lastName, $position"
    }
}
