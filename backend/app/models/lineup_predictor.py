def predict_starting_xi(players):

    for p in players:

        p["score"] = (
            p["minutes"] * 0.4 +
            p["form"] * 0.3 +
            p["fitness"] * 0.3
        )

    players.sort(key=lambda x: x["score"], reverse=True)

    return players[:11]