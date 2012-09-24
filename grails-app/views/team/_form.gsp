<%@ page import="junk.Team" %>


<div class="fieldcontain ${hasErrors(bean: teamInstance, field: 'name', 'error')} ">
    <label for="name">
        <g:message code="team.name.label" default="Name"/>
    </label>
    <g:textField name="name" value="${teamInstance?.name}"/>
</div>

<div class="fieldcontain ${hasErrors(bean: teamInstance, field: 'players', 'error')} ">
    <label for="players">
        <g:message code="team.players.label" default="Players"/>
    </label>

    <ul class="one-to-many">
        <table data="{tableName:'players'}">
            <thead>
                <tr>
                    <th data="{required:true, name:'firstName', placeholder:'Required'}">First Name</th>
                    <th data="{required:true, name:'lastName', placeholder:'Required'}">Last Name</th>
                    <th data="{required:true, name:'position', placeholder:'Required'}">Position</th>
                    <th data="{editable:false}">&nbsp;</th>
                </tr>
            </thead>
            <tbody>
                <g:each in="${teamInstance?.players}" var="p" status="i">
                <tr rowId="${i}">
                    <td>${p.firstName}</td>
                    <td>${p.lastName}</td>
                    <td>${p.position}</td>
                    <td><r:img class="deleteRowButton" dir='images' file='skin/database_delete.png'/></td>
                </tr>
                </g:each>
            </tbody>
        </table>

        <li class="add"><a id="addPlayerLink" href="#">Add Player</a></li>

    </ul>

</div>

<r:script>
    $(function() {
        $.metadata.setType("attr", "data");

        $("table").writetable({
            autoAddRow: false,
            rowAdded: function( event, row ) {
                console.debug("in the rowAdded callback");
                $(row).children("td").last().append('<r:img class="deleteRowButton" dir="images" file="skin/database_delete.png"/>');
            },
            rowSelected: function(event, row) {
                console.debug("in the rowSelected callback");
            },
            rowRemoved: function(event, row) {
                console.debug("in the rowRemoved callback handler");
                var rowId =  $(row).attr('rowId');
                $(row).parent().append("<input type='hidden' name='players[" + rowId + "].deleted' value='true' />");
//                event.stopPropagation();
            }
        });

        $("#addPlayerLink").click(function() {
            console.debug("in the click handler");
            $("table").writetable("addRow");
            return false;
        });

        $('img.deleteRowButton').on("click", function(event) {
            console.debug("in the deleteRowButton click handler");
            var target = $(event.target);
            var row = target.closest('tr');
            $('table').writetable('removeRow', event, row);
        });

    });
</r:script>

