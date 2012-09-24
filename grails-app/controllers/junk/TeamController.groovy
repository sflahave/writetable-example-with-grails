package junk

class TeamController {

    def index() {
        render view: "list" , model:['teamInstanceList':Team.list(), 'teamInstanceTotal': Team.count()]
    }

    def list() {
        render view: "list" , model:['teamInstanceList':Team.list(), 'teamInstanceTotal': Team.count()]
    }

    def create() {

    }

    def save() {
        def team = new Team(params)
        team.save()
        redirect(action: 'show', params: [id:team.id])
    }

    def edit() {
        render view:"edit", model: ["teamInstance":Team.get(params.id)]
    }

    def update() {
        def team = Team.get(params.id)
        team.properties = params

        // remove deleted players. This relies on the cascade:"all-delete-orphan" setting in Team.
        team.players.removeAll{ it.deleted }

        team.save(flush:true)
        redirect(action: 'show', params: [id:team.id])
    }

    def show() {
        render view: "show", model:['teamInstance':Team.get(params.id)]
    }
}
