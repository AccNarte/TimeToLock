import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(data: { email: string; password: string }): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const user = this.usersRepository.create({
      email: data.email,
      passwordHash: data.password, // Stub: should be hashed
    });
    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    // Stub: Find user by ID
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    // Stub: Find user by email
    return this.usersRepository.findOne({ where: { email } });
  }

  async validateUser(email: string, password: string): Promise<User> {
    // Stub: Validate user credentials (compare hashed password in real implementation)
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    // Stub: Password validation would happen here
    return user;
  }
}


