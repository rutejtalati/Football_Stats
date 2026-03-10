K = 20

def expected_score(rating_a, rating_b):

    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def update_elo(rating_a, rating_b, result):

    exp = expected_score(rating_a, rating_b)

    new_rating = rating_a + K * (result - exp)

    return new_rating