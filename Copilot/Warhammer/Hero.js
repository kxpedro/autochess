class Hero {
  constructor({ name, hp, color, isMelee, isRanged, attackSpeed, attackRange }) {
    this.name = name;
    this.hp = hp;
    this.color = color;
    this.isMelee = isMelee;
    this.isRanged = isRanged;
    this.attackSpeed = attackSpeed;
    this.attackRange = attackRange;
  }
}

export default Hero;
